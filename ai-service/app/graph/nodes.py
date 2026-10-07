"""
LangGraph nodes for the WhatsApp AI Sales Agent.

Graph structure:
  START
    → validate_input
    → load_tenant_context
    → build_prompt
    → call_llm          (with retry/fallback)
    → validate_response
  END

Each node receives the full AgentState and returns a partial update.
"""

import logging
from typing import Any, Dict

from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.graph.state import AgentState
from app.prompts.builder import build_system_prompt, build_messages
from app.config.settings import config

logger = logging.getLogger(__name__)

FALLBACK_MESSAGE = "Thanks for your message! Our team will get back to you shortly."


def validate_input(state: AgentState) -> Dict[str, Any]:
    """
    Node 1: Validate that required input fields are present.
    """
    if not state.get("current_message"):
        return {"error": "current_message is required", "used_fallback": True, "response": FALLBACK_MESSAGE}
    if not state.get("tenant"):
        return {"error": "tenant config is required", "used_fallback": True, "response": FALLBACK_MESSAGE}
    
    logger.debug("validate_input: OK, message=%r", state["current_message"][:50])
    return {}


def load_tenant_context(state: AgentState) -> Dict[str, Any]:
    """
    Node 2: Acknowledge tenant context is loaded.

    In this architecture, tenant data is injected directly into the request
    by the Node.js worker (which loaded it from MongoDB scoped to accountId).
    This node exists to make the graph explicit about this step.
    """
    if state.get("error"):
        return {}  # Skip if already in error state

    tenant = state["tenant"]
    logger.info(
        "load_tenant_context: tenant=%s, faqs=%d, has_pricing=%s",
        tenant.businessName,
        len(tenant.faqs),
        bool(tenant.pricing),
    )
    return {}


def build_prompt_node(state: AgentState) -> Dict[str, Any]:
    """
    Node 3: Build the system prompt and message list for the LLM.

    The system prompt contains ONLY this tenant's data.
    No cross-tenant information is ever included here.
    """
    if state.get("error"):
        return {}

    tenant = state["tenant"]
    system_prompt = build_system_prompt(tenant)
    messages = build_messages(
        system_prompt=system_prompt,
        history=state.get("history", []),
        current_message=state["current_message"],
    )

    logger.debug(
        "build_prompt_node: system_prompt_len=%d, messages=%d",
        len(system_prompt),
        len(messages),
    )

    return {
        "system_prompt": system_prompt,
        "messages_for_llm": messages,
    }


def get_llm_client():
    """Lazy-load the LLM client based on provider config."""
    if config.LLM_PROVIDER == "gemini":
        from langchain_google_genai import ChatGoogleGenerativeAI
        return ChatGoogleGenerativeAI(
            model=config.GEMINI_MODEL,
            google_api_key=config.GOOGLE_API_KEY,
            temperature=0.7,
            timeout=config.LLM_TIMEOUT_SECONDS,
        )
    elif config.LLM_PROVIDER == "openai":
        from langchain_openai import ChatOpenAI
        return ChatOpenAI(
            model=config.OPENAI_MODEL,
            openai_api_key=config.OPENAI_API_KEY,
            temperature=0.7,
            timeout=config.LLM_TIMEOUT_SECONDS,
        )
    else:
        raise ValueError(f"Unsupported LLM_PROVIDER: {config.LLM_PROVIDER}")


@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=config.LLM_RETRY_WAIT_SECONDS, min=2, max=30),
    retry=retry_if_exception_type(Exception),
    reraise=False,
)
async def _call_llm_with_retry(messages: list) -> str:
    """
    Call the LLM with automatic retry using exponential backoff.
    
    Retries on any exception (timeout, rate limit, server error).
    Max 3 attempts with exponential backoff starting at LLM_RETRY_WAIT_SECONDS.
    
    Returns None if all retries fail (tenacity catches and returns None when reraise=False).
    """
    from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

    llm = get_llm_client()

    lc_messages = []
    for msg in messages:
        if msg["role"] == "system":
            lc_messages.append(SystemMessage(content=msg["content"]))
        elif msg["role"] == "user":
            lc_messages.append(HumanMessage(content=msg["content"]))
        elif msg["role"] == "assistant":
            lc_messages.append(AIMessage(content=msg["content"]))

    result = await llm.ainvoke(lc_messages)
    return result.content


async def call_llm_node(state: AgentState) -> Dict[str, Any]:
    """
    Node 4: Call the LLM with retry and fallback.

    - Timeout: LLM_TIMEOUT_SECONDS (set on the LLM client)
    - Retry: up to 3 times with exponential backoff
    - Fallback: if all retries fail, return fallback message
    """
    if state.get("error"):
        return {}

    messages = state.get("messages_for_llm", [])
    if not messages:
        return {"error": "no messages built", "used_fallback": True, "response": FALLBACK_MESSAGE}

    try:
        response_text = await _call_llm_with_retry(messages)

        if not response_text:
            logger.error("call_llm_node: LLM returned empty response")
            return {"response": FALLBACK_MESSAGE, "used_fallback": True}

        logger.info("call_llm_node: LLM responded, len=%d", len(response_text))
        return {"response": response_text, "used_fallback": False}

    except Exception as e:
        logger.error("call_llm_node: All retries failed: %s", str(e))
        return {
            "response": FALLBACK_MESSAGE,
            "used_fallback": True,
            "error": str(e),
        }


def validate_response_node(state: AgentState) -> Dict[str, Any]:
    """
    Node 5: Validate the LLM response.

    Ensures the response is non-empty and within reasonable bounds.
    If invalid, replace with fallback.
    """
    response = state.get("response", "")

    if not response or not response.strip():
        logger.warning("validate_response_node: empty response, using fallback")
        return {"response": FALLBACK_MESSAGE, "used_fallback": True}

    if len(response) > 4096:
        # Truncate overly long responses for WhatsApp compatibility
        response = response[:4000] + "..."
        return {"response": response}

    return {}
