"""
Pydantic models for the AI service request/response.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class FAQ(BaseModel):
    q: str
    a: str


class TenantConfig(BaseModel):
    """
    Tenant-specific configuration passed from the Node.js worker.
    The worker loads this from MongoDB, scoped to accountId.
    This model only knows about one tenant at a time — by design.
    """
    businessName: str
    tone: str
    language: str
    faqs: List[FAQ] = Field(default_factory=list)
    pricing: str


class HistoryMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class AgentRequest(BaseModel):
    """
    Request payload sent by the Node.js worker to the Python AI service.

    Security note: The Node.js worker is responsible for ensuring only
    this tenant's data is included. The Python service trusts the caller
    to have already enforced tenant isolation at the data layer.
    """
    tenant: TenantConfig
    history: List[HistoryMessage] = Field(default_factory=list)
    currentMessage: str


class AgentResponse(BaseModel):
    response: str
    used_fallback: bool = False
