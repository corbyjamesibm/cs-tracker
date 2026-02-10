from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import List
from datetime import datetime, date

from app.core.database import get_db
from app.models.mapping import RoadmapRecommendation, UseCaseTPFeatureMapping
from app.models.roadmap import Roadmap, RoadmapItem, RoadmapItemCategory, RoadmapItemStatus
from app.models.assessment import CustomerAssessment, AssessmentStatus
from app.services.recommendation_engine import RecommendationEngine
from app.schemas.mapping import (
    RoadmapRecommendationResponse,
    RoadmapRecommendationListResponse,
    GenerateRecommendationsRequest,
    AcceptRecommendationRequest,
    UpdateRecommendationRequest,
    RecommendationActionResponse,
)

router = APIRouter()


def build_recommendation_response(rec: RoadmapRecommendation) -> RoadmapRecommendationResponse:
    """Build a response object with nested fields populated."""
    response = RoadmapRecommendationResponse.model_validate(rec)

    # Add nested use case info
    if rec.use_case:
        response.use_case_name = rec.use_case.name
        response.solution_area = rec.use_case.solution_area

    # Add nested TP feature info
    if rec.tp_feature_mapping:
        response.tp_feature_name = rec.tp_feature_mapping.tp_feature_name
        response.tp_feature_id = rec.tp_feature_mapping.tp_feature_id
        response.tp_entity_type = rec.tp_feature_mapping.tp_entity_type

    return response


@router.post("/generate", response_model=RoadmapRecommendationListResponse)
async def generate_recommendations(
    request: GenerateRecommendationsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Generate roadmap recommendations for a customer based on their assessment.
    Identifies weak dimensions and recommends use cases to improve them.
    """
    # Check for completed assessment
    assessment_query = select(CustomerAssessment).where(
        CustomerAssessment.customer_id == request.customer_id,
        CustomerAssessment.status == AssessmentStatus.COMPLETED
    ).order_by(CustomerAssessment.completed_at.desc()).limit(1)

    result = await db.execute(assessment_query)
    assessment = result.scalar_one_or_none()

    if not assessment:
        raise HTTPException(
            status_code=400,
            detail="No completed assessment found for this customer"
        )

    if not assessment.dimension_scores:
        raise HTTPException(
            status_code=400,
            detail="Assessment has no dimension scores"
        )

    # Generate recommendations
    engine = RecommendationEngine(db)
    recommendations = await engine.generate_recommendations(
        customer_id=request.customer_id,
        threshold=request.threshold,
        limit=request.limit,
        regenerate=request.regenerate
    )

    # Load relationships for response
    rec_ids = [r.id for r in recommendations]
    if rec_ids:
        query = select(RoadmapRecommendation).where(
            RoadmapRecommendation.id.in_(rec_ids)
        ).options(
            selectinload(RoadmapRecommendation.use_case),
            selectinload(RoadmapRecommendation.tp_feature_mapping),
        ).order_by(RoadmapRecommendation.priority_score.desc())

        result = await db.execute(query)
        recommendations = result.scalars().all()

    # Build weak dimensions summary
    weak_dimensions = []
    for dim_name, score in assessment.dimension_scores.items():
        if score < request.threshold:
            weak_dimensions.append({"name": dim_name, "score": score})
    weak_dimensions.sort(key=lambda x: x["score"])

    items = [build_recommendation_response(r) for r in recommendations]

    return RoadmapRecommendationListResponse(
        items=items,
        total=len(items),
        weak_dimensions=weak_dimensions
    )


@router.get("/customer/{customer_id}", response_model=RoadmapRecommendationListResponse)
async def get_customer_recommendations(
    customer_id: int,
    include_dismissed: bool = False,
    include_accepted: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Get existing recommendations for a customer."""
    engine = RecommendationEngine(db)
    recommendations = await engine.get_customer_recommendations(
        customer_id=customer_id,
        include_dismissed=include_dismissed,
        include_accepted=include_accepted
    )

    # Get weak dimensions from latest assessment
    assessment_query = select(CustomerAssessment).where(
        CustomerAssessment.customer_id == customer_id,
        CustomerAssessment.status == AssessmentStatus.COMPLETED
    ).order_by(CustomerAssessment.completed_at.desc()).limit(1)

    result = await db.execute(assessment_query)
    assessment = result.scalar_one_or_none()

    weak_dimensions = None
    if assessment and assessment.dimension_scores:
        weak_dimensions = []
        # Use 3.5 as default threshold
        for dim_name, score in assessment.dimension_scores.items():
            if score < 3.5:
                weak_dimensions.append({"name": dim_name, "score": score})
        weak_dimensions.sort(key=lambda x: x["score"])

    items = [build_recommendation_response(r) for r in recommendations]

    return RoadmapRecommendationListResponse(
        items=items,
        total=len(items),
        weak_dimensions=weak_dimensions
    )


@router.post("/{recommendation_id}/accept", response_model=RecommendationActionResponse)
async def accept_recommendation(
    recommendation_id: int,
    request: AcceptRecommendationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Accept a recommendation and add it to the customer's roadmap.
    Creates a new RoadmapItem linked to this recommendation.
    """
    # Get the recommendation
    query = select(RoadmapRecommendation).where(
        RoadmapRecommendation.id == recommendation_id
    ).options(
        selectinload(RoadmapRecommendation.use_case),
        selectinload(RoadmapRecommendation.tp_feature_mapping),
    )
    result = await db.execute(query)
    recommendation = result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if recommendation.is_accepted:
        raise HTTPException(status_code=400, detail="Recommendation already accepted")

    # Get or create customer's roadmap
    roadmap_query = select(Roadmap).where(
        Roadmap.customer_id == recommendation.customer_id,
        Roadmap.is_active == True
    )
    result = await db.execute(roadmap_query)
    roadmap = result.scalar_one_or_none()

    if not roadmap:
        # Create a new roadmap for the customer
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

    # Create roadmap item from recommendation
    roadmap_item = RoadmapItem(
        roadmap_id=roadmap.id,
        title=recommendation.title,
        description=f"{recommendation.description}\n\nGenerated from assessment recommendation.",
        category=RoadmapItemCategory.FEATURE,
        status=RoadmapItemStatus.PLANNED,
        target_quarter=request.target_quarter,
        target_year=request.target_year,
        notes=request.notes,
        tools=request.tools,
    )
    db.add(roadmap_item)
    await db.flush()

    # Update recommendation
    recommendation.is_accepted = True
    recommendation.accepted_at = datetime.utcnow()
    recommendation.roadmap_item_id = roadmap_item.id

    await db.flush()

    return RecommendationActionResponse(
        success=True,
        message="Recommendation accepted and added to roadmap",
        recommendation_id=recommendation.id,
        roadmap_item_id=roadmap_item.id
    )


@router.delete("/{recommendation_id}", response_model=RecommendationActionResponse)
async def dismiss_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Dismiss a recommendation (mark as not relevant)."""
    recommendation = await db.get(RoadmapRecommendation, recommendation_id)

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if recommendation.is_accepted:
        raise HTTPException(status_code=400, detail="Cannot dismiss an accepted recommendation")

    recommendation.is_dismissed = True
    await db.flush()

    return RecommendationActionResponse(
        success=True,
        message="Recommendation dismissed",
        recommendation_id=recommendation.id
    )


@router.post("/{recommendation_id}/restore", response_model=RecommendationActionResponse)
async def restore_recommendation(
    recommendation_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Restore a previously dismissed recommendation."""
    recommendation = await db.get(RoadmapRecommendation, recommendation_id)

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    if not recommendation.is_dismissed:
        raise HTTPException(status_code=400, detail="Recommendation is not dismissed")

    recommendation.is_dismissed = False
    await db.flush()

    return RecommendationActionResponse(
        success=True,
        message="Recommendation restored",
        recommendation_id=recommendation.id
    )


@router.patch("/{recommendation_id}", response_model=RoadmapRecommendationResponse)
async def update_recommendation(
    recommendation_id: int,
    request: UpdateRecommendationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Update an AI-generated recommendation.
    Allows editing title, description, priority score, and dimension name.
    """
    # Eager load relationships for response
    result = await db.execute(
        select(RoadmapRecommendation)
        .options(
            selectinload(RoadmapRecommendation.use_case),
            selectinload(RoadmapRecommendation.tp_feature_mapping)
        )
        .where(RoadmapRecommendation.id == recommendation_id)
    )
    recommendation = result.scalar_one_or_none()

    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    # Update fields if provided
    if request.title is not None:
        recommendation.title = request.title
    if request.description is not None:
        recommendation.description = request.description
    if request.priority_score is not None:
        recommendation.priority_score = request.priority_score
    if request.dimension_name is not None:
        recommendation.dimension_name = request.dimension_name
    if request.category is not None:
        recommendation.category = request.category
    if request.tools is not None:
        recommendation.tools = request.tools

    recommendation.updated_at = datetime.utcnow()
    await db.flush()

    return build_recommendation_response(recommendation)
