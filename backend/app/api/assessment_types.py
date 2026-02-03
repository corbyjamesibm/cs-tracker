"""API endpoints for assessment types and multi-type aggregation."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.assessment_type import AssessmentType
from app.models.assessment import CustomerAssessment, AssessmentStatus
from app.models.customer import Customer
from app.models.mapping import AggregatedRecommendation
from app.services.assessment_aggregation import AssessmentAggregationService
from app.schemas.assessment_type import (
    AssessmentTypeCreate,
    AssessmentTypeUpdate,
    AssessmentTypeResponse,
    AssessmentTypeListResponse,
    CustomerAssessmentSummaryResponse,
    ComprehensiveReportResponse,
    TypeSpecificReport,
    TypeSpecificScores,
    TypeSpecificRecommendation,
    DimensionScoreDetail,
    OverallSection,
    OverallTypeScore,
    CrossTypeAnalysis,
    CrossTypeInsight,
    AggregatedRecommendationResponse,
    AggregatedRecommendationListResponse,
    UnifiedRoadmap,
    GenerateAggregatedRecommendationsRequest,
    AcceptAggregatedRecommendationRequest,
    UpdateAggregatedRecommendationRequest,
)

router = APIRouter()


# ============================================================
# ASSESSMENT TYPE CRUD ENDPOINTS
# ============================================================

@router.get("/", response_model=AssessmentTypeListResponse)
async def list_assessment_types(
    db: AsyncSession = Depends(get_db),
    active_only: bool = Query(True, description="Only show active types"),
):
    """List all assessment types."""
    service = AssessmentAggregationService(db)
    types = await service.get_assessment_types(active_only=active_only)

    return AssessmentTypeListResponse(
        items=[AssessmentTypeResponse.model_validate(t) for t in types],
        total=len(types)
    )


@router.get("/{type_id}", response_model=AssessmentTypeResponse)
async def get_assessment_type(
    type_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get a specific assessment type."""
    query = select(AssessmentType).where(AssessmentType.id == type_id)
    result = await db.execute(query)
    atype = result.scalar_one_or_none()

    if not atype:
        raise HTTPException(status_code=404, detail="Assessment type not found")

    return AssessmentTypeResponse.model_validate(atype)


@router.get("/code/{type_code}", response_model=AssessmentTypeResponse)
async def get_assessment_type_by_code(
    type_code: str,
    db: AsyncSession = Depends(get_db),
):
    """Get an assessment type by its code (spm, tbm, finops)."""
    service = AssessmentAggregationService(db)
    atype = await service.get_assessment_type_by_code(type_code.lower())

    if not atype:
        raise HTTPException(status_code=404, detail=f"Assessment type '{type_code}' not found")

    return AssessmentTypeResponse.model_validate(atype)


@router.post("/", response_model=AssessmentTypeResponse)
async def create_assessment_type(
    data: AssessmentTypeCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new assessment type."""
    # Check for duplicate code
    query = select(AssessmentType).where(AssessmentType.code == data.code.lower())
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail=f"Assessment type with code '{data.code}' already exists")

    atype = AssessmentType(
        code=data.code.lower(),
        name=data.name,
        short_name=data.short_name,
        description=data.description,
        color=data.color,
        display_order=data.display_order,
        is_active=data.is_active,
    )
    db.add(atype)
    await db.commit()
    await db.refresh(atype)

    return AssessmentTypeResponse.model_validate(atype)


@router.patch("/{type_id}", response_model=AssessmentTypeResponse)
async def update_assessment_type(
    type_id: int,
    data: AssessmentTypeUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update an assessment type."""
    query = select(AssessmentType).where(AssessmentType.id == type_id)
    result = await db.execute(query)
    atype = result.scalar_one_or_none()

    if not atype:
        raise HTTPException(status_code=404, detail="Assessment type not found")

    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(atype, field, value)

    await db.commit()
    await db.refresh(atype)

    return AssessmentTypeResponse.model_validate(atype)


# ============================================================
# CUSTOMER ASSESSMENT SUMMARY ENDPOINTS
# ============================================================

@router.get("/customers/{customer_id}/summary", response_model=CustomerAssessmentSummaryResponse)
async def get_customer_assessment_summary(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    refresh: bool = Query(False, description="Force refresh of summary"),
):
    """Get aggregated assessment summary for a customer across all types."""
    # Verify customer exists
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    service = AssessmentAggregationService(db)

    if refresh:
        summary = await service.update_customer_assessment_summary(customer_id)
        await db.commit()
    else:
        summary = await service.get_customer_assessment_summary(customer_id)
        if not summary:
            # Create summary if it doesn't exist
            summary = await service.update_customer_assessment_summary(customer_id)
            await db.commit()

    return CustomerAssessmentSummaryResponse.model_validate(summary)


# ============================================================
# COMPREHENSIVE REPORT ENDPOINT
# ============================================================

@router.get("/customers/{customer_id}/comprehensive-report", response_model=ComprehensiveReportResponse)
async def get_comprehensive_report(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Get comprehensive multi-type assessment report for a customer."""
    # Verify customer exists
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    customer = result.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    service = AssessmentAggregationService(db)

    # Get assessment types
    types = await service.get_assessment_types()

    # Get latest assessments for each type
    assessments_by_type = await service.get_latest_assessments_all_types(customer_id)

    # Build type-specific reports
    assessment_reports = []
    overall_type_scores = []
    assessment_coverage = 0

    for atype in types:
        assessment = assessments_by_type.get(atype.code)

        # Build scores
        has_assessment = assessment is not None and assessment.overall_score is not None
        if has_assessment:
            assessment_coverage += 1

        dimensions = []
        if assessment and assessment.dimension_scores:
            for dim_name, score in assessment.dimension_scores.items():
                dimensions.append(DimensionScoreDetail(
                    name=dim_name,
                    score=score,
                    weight=1.0
                ))

        type_scores = TypeSpecificScores(
            assessment_type_code=atype.code,
            assessment_type_name=atype.name,
            assessment_type_color=atype.color,
            assessment_id=assessment.id if assessment else None,
            assessment_date=assessment.completed_at if assessment else None,
            overall_score=assessment.overall_score if assessment else None,
            dimensions=dimensions,
            has_assessment=has_assessment,
        )

        # Get type-specific recommendations
        recommendations = []
        if assessment:
            recs = await service.get_recommendations_by_type(
                customer_id, assessment_type_id=atype.id
            )
            for rec in recs:
                recommendations.append(TypeSpecificRecommendation(
                    id=rec.id,
                    title=rec.title,
                    description=rec.description,
                    dimension_name=rec.dimension_name,
                    dimension_score=rec.dimension_score,
                    priority_score=rec.priority_score,
                    improvement_potential=rec.improvement_potential,
                    use_case_id=rec.use_case_id,
                    use_case_name=rec.use_case.name if rec.use_case else None,
                    is_accepted=rec.is_accepted,
                    is_dismissed=rec.is_dismissed,
                    assessment_type_code=atype.code,
                    assessment_type_color=atype.color,
                ))

        report = TypeSpecificReport(
            assessment_type=AssessmentTypeResponse.model_validate(atype),
            scores=type_scores,
            recommendations=recommendations,
            recommendation_count=len(recommendations),
        )
        assessment_reports.append(report)

        # Build overall type score
        overall_type_scores.append(OverallTypeScore(
            type_code=atype.code,
            type_name=atype.name,
            short_name=atype.short_name,
            color=atype.color,
            overall_score=assessment.overall_score if assessment else None,
            has_assessment=has_assessment,
            assessment_date=assessment.completed_at if assessment else None,
        ))

    # Calculate overall maturity score
    valid_scores = [
        s.overall_score for s in overall_type_scores
        if s.overall_score is not None
    ]
    overall_maturity = sum(valid_scores) / len(valid_scores) if valid_scores else None

    overall_section = OverallSection(
        overall_maturity_score=overall_maturity,
        type_scores=overall_type_scores,
        assessment_coverage=assessment_coverage,
        total_types=len(types),
    )

    # Get cross-type analysis
    cross_analysis_data = await service.get_cross_type_analysis(customer_id)
    cross_type_analysis = CrossTypeAnalysis(
        common_weak_dimensions=cross_analysis_data["common_weak_dimensions"],
        common_strong_dimensions=cross_analysis_data["common_strong_dimensions"],
        type_coverage=cross_analysis_data["type_coverage"],
        insights=[CrossTypeInsight(**i) for i in cross_analysis_data["insights"]],
        synergy_opportunities=cross_analysis_data["synergy_opportunities"],
    )

    # Get top aggregated recommendations
    aggregated_recs = await service.get_aggregated_recommendations(customer_id)
    top_recommendations = [
        AggregatedRecommendationResponse(
            id=r.id,
            customer_id=r.customer_id,
            use_case_id=r.use_case_id,
            use_case_name=r.use_case.name if r.use_case else None,
            title=r.title,
            description=r.description,
            source_assessment_types=r.source_assessment_types,
            source_recommendation_ids=r.source_recommendation_ids,
            combined_priority_score=r.combined_priority_score,
            base_priority_score=r.base_priority_score,
            is_synergistic=r.is_synergistic,
            estimated_effort=r.estimated_effort,
            target_quarter=r.target_quarter,
            target_year=r.target_year,
            is_accepted=r.is_accepted,
            is_dismissed=r.is_dismissed,
            roadmap_item_id=r.roadmap_item_id,
            created_at=r.created_at,
            updated_at=r.updated_at,
        )
        for r in aggregated_recs[:10]
    ]

    # Build unified roadmap
    roadmap_data = await service.build_unified_roadmap(customer_id)
    unified_roadmap = UnifiedRoadmap(**roadmap_data)

    return ComprehensiveReportResponse(
        customer_id=customer_id,
        customer_name=customer.name,
        assessment_reports=assessment_reports,
        overall_section=overall_section,
        cross_type_analysis=cross_type_analysis,
        top_recommendations=top_recommendations,
        unified_roadmap=unified_roadmap,
        generated_at=datetime.utcnow(),
    )


# ============================================================
# AGGREGATED RECOMMENDATIONS ENDPOINTS
# ============================================================

@router.get(
    "/customers/{customer_id}/recommendations/aggregated",
    response_model=AggregatedRecommendationListResponse
)
async def get_aggregated_recommendations(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    include_dismissed: bool = Query(False, description="Include dismissed recommendations"),
    include_accepted: bool = Query(True, description="Include accepted recommendations"),
):
    """Get aggregated recommendations for a customer across all assessment types."""
    # Verify customer exists
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")

    service = AssessmentAggregationService(db)
    recommendations = await service.get_aggregated_recommendations(
        customer_id,
        include_dismissed=include_dismissed,
        include_accepted=include_accepted,
    )

    items = []
    synergistic_count = 0
    for rec in recommendations:
        items.append(AggregatedRecommendationResponse(
            id=rec.id,
            customer_id=rec.customer_id,
            use_case_id=rec.use_case_id,
            use_case_name=rec.use_case.name if rec.use_case else None,
            title=rec.title,
            description=rec.description,
            source_assessment_types=rec.source_assessment_types,
            source_recommendation_ids=rec.source_recommendation_ids,
            combined_priority_score=rec.combined_priority_score,
            base_priority_score=rec.base_priority_score,
            is_synergistic=rec.is_synergistic,
            estimated_effort=rec.estimated_effort,
            target_quarter=rec.target_quarter,
            target_year=rec.target_year,
            is_accepted=rec.is_accepted,
            is_dismissed=rec.is_dismissed,
            roadmap_item_id=rec.roadmap_item_id,
            created_at=rec.created_at,
            updated_at=rec.updated_at,
        ))
        if rec.is_synergistic:
            synergistic_count += 1

    return AggregatedRecommendationListResponse(
        items=items,
        total=len(items),
        synergistic_count=synergistic_count,
    )


@router.post(
    "/customers/{customer_id}/recommendations/aggregate",
    response_model=AggregatedRecommendationListResponse
)
async def generate_aggregated_recommendations(
    customer_id: int,
    request: GenerateAggregatedRecommendationsRequest,
    db: AsyncSession = Depends(get_db),
):
    """Generate/regenerate aggregated recommendations for a customer."""
    # Verify customer exists
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")

    service = AssessmentAggregationService(db)
    recommendations = await service.aggregate_recommendations(
        customer_id,
        include_dismissed=request.include_dismissed,
        limit=request.limit,
    )
    await db.commit()

    items = []
    synergistic_count = 0
    for rec in recommendations:
        items.append(AggregatedRecommendationResponse(
            id=rec.id,
            customer_id=rec.customer_id,
            use_case_id=rec.use_case_id,
            use_case_name=rec.use_case.name if rec.use_case else None,
            title=rec.title,
            description=rec.description,
            source_assessment_types=rec.source_assessment_types,
            source_recommendation_ids=rec.source_recommendation_ids,
            combined_priority_score=rec.combined_priority_score,
            base_priority_score=rec.base_priority_score,
            is_synergistic=rec.is_synergistic,
            estimated_effort=rec.estimated_effort,
            target_quarter=rec.target_quarter,
            target_year=rec.target_year,
            is_accepted=rec.is_accepted,
            is_dismissed=rec.is_dismissed,
            roadmap_item_id=rec.roadmap_item_id,
            created_at=rec.created_at,
            updated_at=rec.updated_at,
        ))
        if rec.is_synergistic:
            synergistic_count += 1

    return AggregatedRecommendationListResponse(
        items=items,
        total=len(items),
        synergistic_count=synergistic_count,
    )


@router.patch(
    "/customers/{customer_id}/recommendations/aggregated/{recommendation_id}",
    response_model=AggregatedRecommendationResponse
)
async def update_aggregated_recommendation(
    customer_id: int,
    recommendation_id: int,
    request: UpdateAggregatedRecommendationRequest,
    db: AsyncSession = Depends(get_db),
):
    """Update an aggregated recommendation."""
    query = select(AggregatedRecommendation).where(
        AggregatedRecommendation.id == recommendation_id,
        AggregatedRecommendation.customer_id == customer_id,
    ).options(selectinload(AggregatedRecommendation.use_case))
    result = await db.execute(query)
    rec = result.scalar_one_or_none()

    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    update_data = request.model_dump(exclude_unset=True)

    # Handle accept/dismiss logic
    if update_data.get("is_accepted"):
        rec.is_accepted = True
        rec.is_dismissed = False
        rec.accepted_at = datetime.utcnow()
        rec.dismissed_at = None
    elif update_data.get("is_dismissed"):
        rec.is_dismissed = True
        rec.is_accepted = False
        rec.dismissed_at = datetime.utcnow()
        rec.accepted_at = None

    # Update other fields
    for field in ["target_quarter", "target_year", "estimated_effort"]:
        if field in update_data:
            setattr(rec, field, update_data[field])

    await db.commit()
    await db.refresh(rec)

    return AggregatedRecommendationResponse(
        id=rec.id,
        customer_id=rec.customer_id,
        use_case_id=rec.use_case_id,
        use_case_name=rec.use_case.name if rec.use_case else None,
        title=rec.title,
        description=rec.description,
        source_assessment_types=rec.source_assessment_types,
        source_recommendation_ids=rec.source_recommendation_ids,
        combined_priority_score=rec.combined_priority_score,
        base_priority_score=rec.base_priority_score,
        is_synergistic=rec.is_synergistic,
        estimated_effort=rec.estimated_effort,
        target_quarter=rec.target_quarter,
        target_year=rec.target_year,
        is_accepted=rec.is_accepted,
        is_dismissed=rec.is_dismissed,
        roadmap_item_id=rec.roadmap_item_id,
        created_at=rec.created_at,
        updated_at=rec.updated_at,
    )


# ============================================================
# UNIFIED ROADMAP ENDPOINT
# ============================================================

@router.get("/customers/{customer_id}/unified-roadmap", response_model=UnifiedRoadmap)
async def get_unified_roadmap(
    customer_id: int,
    db: AsyncSession = Depends(get_db),
    include_accepted: bool = Query(True, description="Include accepted recommendations"),
):
    """Get unified roadmap for a customer combining all assessment types."""
    # Verify customer exists
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Customer not found")

    service = AssessmentAggregationService(db)
    roadmap_data = await service.build_unified_roadmap(
        customer_id, include_accepted=include_accepted
    )

    return UnifiedRoadmap(**roadmap_data)
