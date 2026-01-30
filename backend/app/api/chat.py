"""Chat API endpoint for LLM-powered assistant."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.auth import get_current_user
from app.core.config import settings
from app.models.user import User
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.llm_service import LLMService
from app.services.ai_provider import get_ai_provider, check_ai_status

router = APIRouter()


@router.get("/ai/status")
async def get_ai_status():
    """
    Get the status of AI providers.

    Returns information about:
    - Configured provider
    - Ollama availability and installed models
    - Anthropic API availability
    - Currently active provider
    """
    return await check_ai_status()


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to the CS Assistant and receive a response.

    The assistant can:
    - Query customer data (health, ARR, renewals, risks)
    - Search and list tasks
    - Create tasks, log engagements, and create risks (based on user permissions)
    - Provide portfolio summaries and insights

    Uses Ollama (local) by default, falls back to Anthropic if configured.
    """
    try:
        provider = get_ai_provider()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=str(e)
        )

    service = LLMService(db, current_user, provider)
    return await service.chat(request)
