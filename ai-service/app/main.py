"""
FastAPI application for the WhatsApp AI Sales Agent service.

Endpoints:
  GET  /health  — liveness check
  POST /agent/reply — main AI endpoint (called by Node.js worker)

This service is only called by the Node.js backend worker.
It does NOT connect to MongoDB — all data comes via the request payload.
The Node.js worker is responsible for tenant isolation before calling here.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app.config.settings import config, validate_config
from app.models.schemas import AgentRequest, AgentResponse
from app.graph.graph import agent_graph

# Configure logging
logging.basicConfig(
    level=getattr(logging, config.LOG_LEVEL, logging.INFO),
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler — startup and shutdown."""
    logger.info("AI Service starting up...")
    try:
        validate_config()
        logger.info("Configuration validated. LLM provider: %s", config.LLM_PROVIDER)
        logger.info("AI Service ready on port %d", config.PORT)
    except RuntimeError as e:
        logger.error("Configuration error: %s", str(e))
        sys.exit(1)

    yield  # Application runs here

    logger.info("AI Service shutting down...")


app = FastAPI(
    title="WhatsApp AI Sales Agent",
    description="LangGraph-based AI agent for multi-tenant WhatsApp sales automation",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
async def health():
    return {"status": "ok", "llm_provider": config.LLM_PROVIDER}


@app.post("/agent/reply", response_model=AgentResponse)
async def agent_reply(request: AgentRequest):
    """
    Generate an AI reply for a WhatsApp message.

    Called by the Node.js worker after:
    1. Loading tenant config from MongoDB (scoped to accountId)
    2. Loading conversation history (last 10 messages for this lead)

    The request contains ONLY this tenant's data — cross-tenant isolation
    is enforced by the Node.js worker before this endpoint is called.

    Returns:
        AgentResponse with the generated text and whether a fallback was used.
    """
    logger.info(
        "agent_reply: tenant=%s, history_len=%d, message=%r",
        request.tenant.businessName,
        len(request.history),
        request.currentMessage[:50],
    )

    try:
        # Invoke the LangGraph agent
        initial_state = {
            "tenant": request.tenant,
            "history": request.history,
            "current_message": request.currentMessage,
            "system_prompt": None,
            "messages_for_llm": None,
            "response": None,
            "used_fallback": False,
            "error": None,
        }

        result = await agent_graph.ainvoke(initial_state)

        response_text = result.get("response", "")
        used_fallback = result.get("used_fallback", False)

        if not response_text:
            response_text = "Thanks for your message! Our team will get back to you shortly."
            used_fallback = True

        logger.info(
            "agent_reply: done, used_fallback=%s, response_len=%d",
            used_fallback,
            len(response_text),
        )

        return AgentResponse(response=response_text, used_fallback=used_fallback)

    except Exception as e:
        logger.error("agent_reply: unexpected error: %s", str(e), exc_info=True)
        # Return fallback instead of 500 — the worker can still save the message
        return AgentResponse(
            response="Thanks for your message! Our team will get back to you shortly.",
            used_fallback=True,
        )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error("Unhandled exception: %s", str(exc), exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )
