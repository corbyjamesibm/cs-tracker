"""AI features API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional

from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user import User
from app.services.ai_features import AIFeatures
from app.services.ai_provider import check_ai_status

router = APIRouter()


@router.get("/status")
async def get_ai_status():
    """
    Get the status of AI providers.

    Returns information about:
    - Configured provider (ollama or anthropic)
    - Ollama availability and installed models
    - Anthropic API availability
    - Currently active provider
    """
    return await check_ai_status()


@router.get("/customer/{customer_id}/summary")
async def get_customer_summary(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate an AI-powered summary for a customer.

    Returns a concise executive summary including:
    - Health overview
    - Key metrics (ARR, renewal, adoption)
    - Recent activity summary
    - Risks and issues
    - Recommended actions
    """
    ai = AIFeatures(db)

    try:
        result = await ai.summarize_customer(customer_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")


@router.get("/customer/{customer_id}/meeting-prep")
async def get_meeting_prep(
    customer_id: int,
    meeting_context: Optional[str] = Query(None, description="Meeting context (e.g., 'QBR', 'escalation call')"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Generate a meeting prep briefing for a customer.

    Returns a briefing that includes:
    - Customer snapshot
    - Key topics to address
    - Talking points
    - Questions to ask
    - Action items to follow up
    """
    ai = AIFeatures(db)

    try:
        result = await ai.generate_meeting_prep(customer_id, meeting_context)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")


@router.get("/customer/{customer_id}/risk-analysis")
async def get_risk_analysis(
    customer_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Analyze customer data for risk signals.

    Returns analysis including:
    - Detected risk signals
    - Overall risk level
    - Contributing factors
    - Early warning signs
    - Mitigation recommendations
    """
    ai = AIFeatures(db)

    try:
        result = await ai.analyze_risk_signals(customer_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return result
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI service error: {str(e)}")
