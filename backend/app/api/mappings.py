from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

from app.core.database import get_db
from app.models.mapping import DimensionUseCaseMapping, UseCaseTPFeatureMapping
from app.models.assessment import AssessmentDimension
from app.models.use_case import UseCase
from app.schemas.mapping import (
    DimensionUseCaseMappingCreate,
    DimensionUseCaseMappingUpdate,
    DimensionUseCaseMappingResponse,
    DimensionUseCaseMappingListResponse,
    UseCaseTPFeatureMappingCreate,
    UseCaseTPFeatureMappingUpdate,
    UseCaseTPFeatureMappingResponse,
    UseCaseTPFeatureMappingListResponse,
    TPSearchResult,
    TPSearchResponse,
)

router = APIRouter()


# =============================================================================
# Dimension -> Use Case Mappings
# =============================================================================

@router.get("/dimension-use-case", response_model=DimensionUseCaseMappingListResponse)
async def list_dimension_use_case_mappings(
    dimension_id: Optional[int] = None,
    use_case_id: Optional[int] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all dimension to use case mappings with optional filtering."""
    query = select(DimensionUseCaseMapping).options(
        selectinload(DimensionUseCaseMapping.dimension),
        selectinload(DimensionUseCaseMapping.use_case)
    ).order_by(DimensionUseCaseMapping.priority)

    if dimension_id:
        query = query.where(DimensionUseCaseMapping.dimension_id == dimension_id)
    if use_case_id:
        query = query.where(DimensionUseCaseMapping.use_case_id == use_case_id)

    result = await db.execute(query)
    mappings = result.scalars().all()

    items = []
    for m in mappings:
        item = DimensionUseCaseMappingResponse.model_validate(m)
        item.dimension_name = m.dimension.name if m.dimension else None
        item.use_case_name = m.use_case.name if m.use_case else None
        item.solution_area = m.use_case.solution_area if m.use_case else None
        items.append(item)

    return DimensionUseCaseMappingListResponse(items=items, total=len(items))


@router.post("/dimension-use-case", response_model=DimensionUseCaseMappingResponse, status_code=201)
async def create_dimension_use_case_mapping(
    mapping_in: DimensionUseCaseMappingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new dimension to use case mapping."""
    # Verify dimension exists
    dimension = await db.get(AssessmentDimension, mapping_in.dimension_id)
    if not dimension:
        raise HTTPException(status_code=404, detail="Assessment dimension not found")

    # Verify use case exists
    use_case = await db.get(UseCase, mapping_in.use_case_id)
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    # Check for duplicate mapping
    existing_query = select(DimensionUseCaseMapping).where(
        DimensionUseCaseMapping.dimension_id == mapping_in.dimension_id,
        DimensionUseCaseMapping.use_case_id == mapping_in.use_case_id
    )
    result = await db.execute(existing_query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mapping already exists")

    mapping = DimensionUseCaseMapping(**mapping_in.model_dump())
    db.add(mapping)
    await db.flush()
    await db.refresh(mapping)

    response = DimensionUseCaseMappingResponse.model_validate(mapping)
    response.dimension_name = dimension.name
    response.use_case_name = use_case.name
    response.solution_area = use_case.solution_area

    return response


@router.patch("/dimension-use-case/{mapping_id}", response_model=DimensionUseCaseMappingResponse)
async def update_dimension_use_case_mapping(
    mapping_id: int,
    mapping_in: DimensionUseCaseMappingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a dimension to use case mapping."""
    query = select(DimensionUseCaseMapping).where(
        DimensionUseCaseMapping.id == mapping_id
    ).options(
        selectinload(DimensionUseCaseMapping.dimension),
        selectinload(DimensionUseCaseMapping.use_case)
    )
    result = await db.execute(query)
    mapping = result.scalar_one_or_none()

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = mapping_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mapping, field, value)

    await db.flush()
    await db.refresh(mapping)

    response = DimensionUseCaseMappingResponse.model_validate(mapping)
    response.dimension_name = mapping.dimension.name if mapping.dimension else None
    response.use_case_name = mapping.use_case.name if mapping.use_case else None
    response.solution_area = mapping.use_case.solution_area if mapping.use_case else None

    return response


@router.delete("/dimension-use-case/{mapping_id}", status_code=204)
async def delete_dimension_use_case_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a dimension to use case mapping."""
    mapping = await db.get(DimensionUseCaseMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    await db.delete(mapping)


# =============================================================================
# Use Case -> TP Feature Mappings
# =============================================================================

@router.get("/use-case-tp", response_model=UseCaseTPFeatureMappingListResponse)
async def list_use_case_tp_mappings(
    use_case_id: Optional[int] = None,
    tp_entity_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all use case to TP feature mappings with optional filtering."""
    query = select(UseCaseTPFeatureMapping).options(
        selectinload(UseCaseTPFeatureMapping.use_case)
    ).order_by(UseCaseTPFeatureMapping.use_case_id, UseCaseTPFeatureMapping.tp_feature_name)

    if use_case_id:
        query = query.where(UseCaseTPFeatureMapping.use_case_id == use_case_id)
    if tp_entity_type:
        query = query.where(UseCaseTPFeatureMapping.tp_entity_type == tp_entity_type)

    result = await db.execute(query)
    mappings = result.scalars().all()

    items = []
    for m in mappings:
        item = UseCaseTPFeatureMappingResponse.model_validate(m)
        item.use_case_name = m.use_case.name if m.use_case else None
        item.solution_area = m.use_case.solution_area if m.use_case else None
        items.append(item)

    return UseCaseTPFeatureMappingListResponse(items=items, total=len(items))


@router.post("/use-case-tp", response_model=UseCaseTPFeatureMappingResponse, status_code=201)
async def create_use_case_tp_mapping(
    mapping_in: UseCaseTPFeatureMappingCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new use case to TP feature mapping."""
    # Verify use case exists
    use_case = await db.get(UseCase, mapping_in.use_case_id)
    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    # Check for duplicate mapping
    existing_query = select(UseCaseTPFeatureMapping).where(
        UseCaseTPFeatureMapping.use_case_id == mapping_in.use_case_id,
        UseCaseTPFeatureMapping.tp_feature_id == mapping_in.tp_feature_id
    )
    result = await db.execute(existing_query)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Mapping already exists")

    mapping = UseCaseTPFeatureMapping(**mapping_in.model_dump())
    mapping.last_synced_at = datetime.utcnow()
    db.add(mapping)
    await db.flush()
    await db.refresh(mapping)

    response = UseCaseTPFeatureMappingResponse.model_validate(mapping)
    response.use_case_name = use_case.name
    response.solution_area = use_case.solution_area

    return response


@router.patch("/use-case-tp/{mapping_id}", response_model=UseCaseTPFeatureMappingResponse)
async def update_use_case_tp_mapping(
    mapping_id: int,
    mapping_in: UseCaseTPFeatureMappingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a use case to TP feature mapping."""
    query = select(UseCaseTPFeatureMapping).where(
        UseCaseTPFeatureMapping.id == mapping_id
    ).options(
        selectinload(UseCaseTPFeatureMapping.use_case)
    )
    result = await db.execute(query)
    mapping = result.scalar_one_or_none()

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    update_data = mapping_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(mapping, field, value)

    await db.flush()
    await db.refresh(mapping)

    response = UseCaseTPFeatureMappingResponse.model_validate(mapping)
    response.use_case_name = mapping.use_case.name if mapping.use_case else None
    response.solution_area = mapping.use_case.solution_area if mapping.use_case else None

    return response


@router.delete("/use-case-tp/{mapping_id}", status_code=204)
async def delete_use_case_tp_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a use case to TP feature mapping."""
    mapping = await db.get(UseCaseTPFeatureMapping, mapping_id)
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    await db.delete(mapping)


@router.post("/use-case-tp/{mapping_id}/sync", response_model=UseCaseTPFeatureMappingResponse)
async def sync_tp_mapping(
    mapping_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync a TP feature mapping to refresh metadata from Targetprocess.
    Note: This is a placeholder - actual TP sync would use MCP tools.
    For now, it just updates the last_synced_at timestamp.
    """
    query = select(UseCaseTPFeatureMapping).where(
        UseCaseTPFeatureMapping.id == mapping_id
    ).options(
        selectinload(UseCaseTPFeatureMapping.use_case)
    )
    result = await db.execute(query)
    mapping = result.scalar_one_or_none()

    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found")

    # In a real implementation, we would call TP API here to get fresh data
    # For now, just update the sync timestamp
    mapping.last_synced_at = datetime.utcnow()
    await db.flush()
    await db.refresh(mapping)

    response = UseCaseTPFeatureMappingResponse.model_validate(mapping)
    response.use_case_name = mapping.use_case.name if mapping.use_case else None
    response.solution_area = mapping.use_case.solution_area if mapping.use_case else None

    return response


# =============================================================================
# TP Search Endpoint (searches Targetprocess for features)
# =============================================================================

@router.get("/use-case-tp/search-tp", response_model=TPSearchResponse)
async def search_tp_features(
    query: str = Query(..., min_length=2, description="Search query for TP features"),
    entity_type: str = Query(default="Feature", description="TP entity type to search"),
    limit: int = Query(default=20, ge=1, le=100)
):
    """
    Search Targetprocess for features/epics/stories.
    Note: This is a placeholder that returns empty results.
    The actual TP search would be performed via MCP tools on the frontend.
    """
    # In the real implementation, this would use TP MCP tools
    # For now, return empty results as TP search is done client-side via MCP
    return TPSearchResponse(items=[], total=0)
