from pydantic import BaseModel
from typing import Optional, List


class ChatContext(BaseModel):
    """Context about the current page/view for better responses."""
    page: Optional[str] = None  # "customer-detail", "dashboard", "tasks", etc.
    customer_id: Optional[int] = None


class ChatRequest(BaseModel):
    """Request to the chat endpoint."""
    message: str
    context: Optional[ChatContext] = None
    conversation_id: Optional[str] = None


class ActionResult(BaseModel):
    """Result of an action taken by the LLM."""
    action_type: str  # "task_created", "engagement_logged", "risk_created", etc.
    entity_type: str  # "task", "engagement", "risk", etc.
    entity_id: int
    summary: str


class ChatResponse(BaseModel):
    """Response from the chat endpoint."""
    message: str
    actions_taken: List[ActionResult] = []
    suggestions: List[str] = []
    conversation_id: str
