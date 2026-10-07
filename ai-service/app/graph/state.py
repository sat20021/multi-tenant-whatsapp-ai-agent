"""
LangGraph agent state definition.
"""

from typing import List, Optional, TypedDict
from app.models.schemas import TenantConfig, HistoryMessage


class AgentState(TypedDict):
    """
    State that flows through the LangGraph nodes.
    
    Each node reads from and writes to this state.
    The graph is a simple linear pipeline for this use case.
    """
    # Input fields (set at entry)
    tenant: TenantConfig
    history: List[HistoryMessage]
    current_message: str

    # Intermediate fields (set by nodes)
    system_prompt: Optional[str]
    messages_for_llm: Optional[List[dict]]

    # Output fields
    response: Optional[str]
    used_fallback: bool
    error: Optional[str]
