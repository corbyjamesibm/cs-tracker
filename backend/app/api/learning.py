"""
Learning System API Endpoints

Endpoints for managing the adaptive recommendation learning system:
- Feedback collection
- Effectiveness metrics
- Weight adjustment
- Configuration management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.learning import (
    RecommendationFeedback, MappingEffectiveness, WeightAdjustmentHistory,
    LearningConfig, LEARNING_CONFIG_DEFAULTS
)
from app.models.mapping import DimensionUseCaseMapping, RoadmapRecommendation
from app.models.roadmap import Roadmap, RoadmapItem, RoadmapItemCategory, RoadmapItemStatus
from app.services.learning_service import AdaptiveLearningService
from app.schemas.learning import (
    SubmitFeedbackRequest, SubmitFeedbackResponse,
    QuickRateRequest,
    MappingEffectivenessResponse, EffectivenessListResponse,
    LearningRunRequest, LearningRunResponse, WeightAdjustmentPreview,
    WeightAdjustmentHistoryResponse, WeightHistoryListResponse,
    LearningConfigItem, LearningConfigResponse, UpdateConfigRequest,
    LearningSummaryResponse, RecommendationFeedbackResponse, FeedbackListResponse
)

router = APIRouter()


# ============================================================
# FEEDBACK ENDPOINTS
# ============================================================

@router.post("/recommendations/{recommendation_id}/feedback", response_model=SubmitFeedbackResponse)
async def submit_feedback(
    recommendation_id: int,
    request: SubmitFeedbackRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit feedback for a recommendation.

    Actions:
    - 'accept': Accept the recommendation and add to roadmap
    - 'dismiss': Dismiss the recommendation with reason
    - 'rating': Just rate without accepting/dismissing
    """
    # Verify recommendation exists
    recommendation = await db.get(RoadmapRecommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Validate request based on action
    if request.action not in ('accept', 'dismiss', 'rating'):
        raise HTTPException(status_code=400, detail="Invalid action. Must be 'accept', 'dismiss', or 'rating'")

    if request.action == 'dismiss' and not request.dismiss_reason_category:
        raise HTTPException(status_code=400, detail="Dismiss reason category is required for dismiss action")

    if request.action == 'accept' and (not request.target_quarter or not request.target_year):
        raise HTTPException(status_code=400, detail="target_quarter and target_year required for accept action")

    # Use advisor_id = 1 for now (would come from auth in production)
    advisor_id = 1

    service = AdaptiveLearningService(db)

    # Record the feedback
    feedback = await service.record_feedback(
        recommendation_id=recommendation_id,
        action=request.action,
        advisor_id=advisor_id,
        quality_rating=request.quality_rating,
        thumbs_feedback=request.thumbs_feedback,
        dismiss_reason_category=request.dismiss_reason_category,
        feedback_reason=request.feedback_reason
    )

    roadmap_item_id = None

    # Handle accept action - create roadmap item
    if request.action == 'accept':
        # Get or create customer's roadmap
        roadmap_query = select(Roadmap).where(
            Roadmap.customer_id == recommendation.customer_id,
            Roadmap.is_active == True
        )
        result = await db.execute(roadmap_query)
        roadmap = result.scalar_one_or_none()

        if not roadmap:
            from datetime import date
            today = date.today()
            roadmap = Roadmap(
                customer_id=recommendation.customer_id,
                name="Product Roadmap",
                start_date=today,
                end_date=date(today.year + 2, today.month, today.day),
                is_active=True
            )
            db.add(roadmap)
            await db.flush()

        # Create roadmap item
        roadmap_item = RoadmapItem(
            roadmap_id=roadmap.id,
            title=recommendation.title,
            description=f"{recommendation.description or ''}\n\nGenerated from assessment recommendation.",
            category=RoadmapItemCategory.FEATURE,
            status=RoadmapItemStatus.PLANNED,
            target_quarter=request.target_quarter,
            target_year=request.target_year,
            notes=request.notes,
        )
        db.add(roadmap_item)
        await db.flush()

        # Update recommendation
        recommendation.is_accepted = True
        recommendation.accepted_at = datetime.utcnow()
        recommendation.roadmap_item_id = roadmap_item.id
        roadmap_item_id = roadmap_item.id

    # Handle dismiss action
    elif request.action == 'dismiss':
        recommendation.is_dismissed = True

    await db.commit()

    return SubmitFeedbackResponse(
        success=True,
        feedback_id=feedback.id,
        message=f"Feedback recorded: {request.action}",
        roadmap_item_id=roadmap_item_id
    )


@router.post("/recommendations/{recommendation_id}/rate")
async def quick_rate(
    recommendation_id: int,
    request: QuickRateRequest,
    db: AsyncSession = Depends(get_db)
):
    """Quick rate a recommendation without accepting/dismissing."""
    recommendation = await db.get(RoadmapRecommendation, recommendation_id)
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if request.rating is None and request.thumbs is None:
        raise HTTPException(status_code=400, detail="Either rating or thumbs must be provided")

    advisor_id = 1  # Would come from auth

    service = AdaptiveLearningService(db)
    feedback = await service.record_feedback(
        recommendation_id=recommendation_id,
        action='rating',
        advisor_id=advisor_id,
        quality_rating=request.rating,
        thumbs_feedback=request.thumbs
    )

    await db.commit()

    return {"success": True, "feedback_id": feedback.id}


@router.get("/recommendations/{recommendation_id}/feedback", response_model=FeedbackListResponse)
async def get_recommendation_feedback(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Get all feedback for a specific recommendation."""
    query = select(RecommendationFeedback).where(
        RecommendationFeedback.recommendation_id == recommendation_id
    ).options(
        selectinload(RecommendationFeedback.advisor)
    ).order_by(RecommendationFeedback.created_at.desc())

    result = await db.execute(query)
    feedbacks = result.scalars().all()

    items = []
    for fb in feedbacks:
        items.append(RecommendationFeedbackResponse(
            id=fb.id,
            recommendation_id=fb.recommendation_id,
            action=fb.action,
            quality_rating=fb.quality_rating,
            thumbs_feedback=fb.thumbs_feedback,
            dismiss_reason_category=fb.dismiss_reason_category,
            feedback_reason=fb.feedback_reason,
            priority_score_at_feedback=fb.priority_score_at_feedback,
            dimension_score_at_feedback=fb.dimension_score_at_feedback,
            advisor_id=fb.advisor_id,
            advisor_name=f"{fb.advisor.first_name} {fb.advisor.last_name}" if fb.advisor else None,
            created_at=fb.created_at
        ))

    return FeedbackListResponse(items=items, total=len(items))


# ============================================================
# EFFECTIVENESS ENDPOINTS
# ============================================================

@router.get("/effectiveness", response_model=EffectivenessListResponse)
async def get_effectiveness_metrics(
    dimension_id: Optional[int] = None,
    min_confidence: float = Query(0.0, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db)
):
    """Get effectiveness metrics for all mappings."""
    query = select(MappingEffectiveness).options(
        selectinload(MappingEffectiveness.mapping).selectinload(DimensionUseCaseMapping.dimension),
        selectinload(MappingEffectiveness.mapping).selectinload(DimensionUseCaseMapping.use_case)
    )

    if min_confidence > 0:
        query = query.where(MappingEffectiveness.confidence_level >= min_confidence)

    result = await db.execute(query)
    effectiveness_records = result.scalars().all()

    # Filter by dimension if specified
    if dimension_id:
        effectiveness_records = [
            e for e in effectiveness_records
            if e.mapping and e.mapping.dimension_id == dimension_id
        ]

    items = []
    for eff in effectiveness_records:
        mapping = eff.mapping
        items.append(MappingEffectivenessResponse(
            id=eff.id,
            mapping_id=eff.mapping_id,
            dimension_name=mapping.dimension.name if mapping and mapping.dimension else None,
            use_case_name=mapping.use_case.name if mapping and mapping.use_case else None,
            current_weight=mapping.impact_weight if mapping else None,
            original_weight=mapping.original_impact_weight if mapping else None,
            total_recommendations=eff.total_recommendations,
            accept_count=eff.accept_count,
            dismiss_count=eff.dismiss_count,
            rating_count=eff.rating_count,
            thumbs_up_count=eff.thumbs_up_count,
            thumbs_down_count=eff.thumbs_down_count,
            accept_rate=eff.accept_rate,
            average_rating=eff.average_rating,
            effectiveness_score=eff.effectiveness_score,
            confidence_level=eff.confidence_level,
            last_calculated_at=eff.last_calculated_at
        ))

    return EffectivenessListResponse(
        items=items,
        total=len(items),
        last_learning_run=None  # Could track this in config
    )


# ============================================================
# LEARNING RUN ENDPOINTS
# ============================================================

@router.post("/run", response_model=LearningRunResponse)
async def run_learning_cycle(
    request: LearningRunRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Run learning cycle to adjust weights based on feedback.

    Set dry_run=true to preview changes without applying.
    """
    service = AdaptiveLearningService(db)

    # Would get from auth in production
    triggered_by_id = 1 if not request.dry_run else None

    result = await service.run_learning_cycle(
        mapping_ids=request.mapping_ids,
        dry_run=request.dry_run,
        triggered_by_id=triggered_by_id
    )

    if not request.dry_run:
        await db.commit()

    adjustments = [
        WeightAdjustmentPreview(
            mapping_id=adj["mapping_id"],
            dimension_name=adj["dimension_name"],
            use_case_name=adj["use_case_name"],
            field=adj["field"],
            old_value=adj["old_value"],
            new_value=adj["new_value"],
            delta=adj["delta"],
            explanation=adj["explanation"],
            would_apply=adj["would_apply"]
        )
        for adj in result["adjustments"]
    ]

    return LearningRunResponse(
        adjustments=adjustments,
        total_evaluated=result["total_evaluated"],
        total_adjusted=result["total_adjusted"],
        skipped_low_confidence=result["skipped_low_confidence"],
        skipped_insufficient_data=result["skipped_insufficient_data"],
        dry_run=request.dry_run
    )


# ============================================================
# HISTORY ENDPOINTS
# ============================================================

@router.get("/history", response_model=WeightHistoryListResponse)
async def get_weight_history(
    mapping_id: Optional[int] = None,
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """Get history of weight adjustments."""
    query = select(WeightAdjustmentHistory).options(
        selectinload(WeightAdjustmentHistory.mapping).selectinload(DimensionUseCaseMapping.dimension),
        selectinload(WeightAdjustmentHistory.mapping).selectinload(DimensionUseCaseMapping.use_case),
        selectinload(WeightAdjustmentHistory.triggered_by)
    ).order_by(WeightAdjustmentHistory.created_at.desc())

    if mapping_id:
        query = query.where(WeightAdjustmentHistory.mapping_id == mapping_id)

    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    history_records = result.scalars().all()

    items = []
    for h in history_records:
        mapping = h.mapping
        items.append(WeightAdjustmentHistoryResponse(
            id=h.id,
            mapping_id=h.mapping_id,
            dimension_name=mapping.dimension.name if mapping and mapping.dimension else None,
            use_case_name=mapping.use_case.name if mapping and mapping.use_case else None,
            field_changed=h.field_changed,
            old_value=h.old_value,
            new_value=h.new_value,
            adjustment_type=h.adjustment_type,
            trigger_event=h.trigger_event,
            explanation=h.explanation,
            feedback_count_at_adjustment=h.feedback_count_at_adjustment,
            accept_rate_at_adjustment=h.accept_rate_at_adjustment,
            average_rating_at_adjustment=h.average_rating_at_adjustment,
            confidence_level_at_adjustment=h.confidence_level_at_adjustment,
            triggered_by_id=h.triggered_by_id,
            triggered_by_name=f"{h.triggered_by.first_name} {h.triggered_by.last_name}" if h.triggered_by else None,
            created_at=h.created_at
        ))

    return WeightHistoryListResponse(items=items, total=len(items))


# ============================================================
# CONFIGURATION ENDPOINTS
# ============================================================

@router.get("/config", response_model=LearningConfigResponse)
async def get_learning_config(db: AsyncSession = Depends(get_db)):
    """Get current learning configuration."""
    result = await db.execute(select(LearningConfig))
    configs = result.scalars().all()

    # Build response including defaults for missing keys
    items = []
    existing_keys = {c.key for c in configs}

    for config in configs:
        items.append(LearningConfigItem(
            key=config.key,
            value=config.value,
            value_type=config.value_type,
            description=config.description,
            updated_at=config.updated_at
        ))

    # Add defaults for any missing keys
    for key, default in LEARNING_CONFIG_DEFAULTS.items():
        if key not in existing_keys:
            items.append(LearningConfigItem(
                key=key,
                value=default["value"],
                value_type=default["type"],
                description=default["description"],
                updated_at=None
            ))

    return LearningConfigResponse(items=items)


@router.put("/config/{key}")
async def update_learning_config(
    key: str,
    request: UpdateConfigRequest,
    db: AsyncSession = Depends(get_db)
):
    """Update a learning configuration value."""
    if key not in LEARNING_CONFIG_DEFAULTS:
        raise HTTPException(status_code=400, detail=f"Unknown configuration key: {key}")

    result = await db.execute(
        select(LearningConfig).where(LearningConfig.key == key)
    )
    config = result.scalar_one_or_none()

    if config:
        config.value = request.value
    else:
        default = LEARNING_CONFIG_DEFAULTS[key]
        config = LearningConfig(
            key=key,
            value=request.value,
            value_type=default["type"],
            description=default["description"]
        )
        db.add(config)

    await db.commit()

    return {"success": True, "key": key, "value": request.value}


# ============================================================
# SUMMARY ENDPOINT
# ============================================================

@router.get("/summary", response_model=LearningSummaryResponse)
async def get_learning_summary(db: AsyncSession = Depends(get_db)):
    """Get summary statistics for the learning system."""
    service = AdaptiveLearningService(db)
    summary = await service.get_learning_summary()

    return LearningSummaryResponse(**summary)
