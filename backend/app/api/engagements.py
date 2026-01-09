from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.models.engagement import Engagement, EngagementType
from app.schemas.engagement import (
    EngagementCreate, EngagementUpdate, EngagementResponse, EngagementListResponse
)

router = APIRouter()


@router.get("", response_model=EngagementListResponse)
async def list_engagements(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    customer_id: Optional[int] = None,
    engagement_type: Optional[EngagementType] = None,
):
    """List engagements with filtering."""
    query = select(Engagement)

    if customer_id:
        query = query.where(Engagement.customer_id == customer_id)
    if engagement_type:
        query = query.where(Engagement.engagement_type == engagement_type)

    query = query.order_by(Engagement.engagement_date.desc())

    # Count
    count_query = select(func.count()).select_from(Engagement)
    if customer_id:
        count_query = count_query.where(Engagement.customer_id == customer_id)
    total = await db.scalar(count_query)

    # Pagination
    query = query.offset(skip).limit(limit)
    query = query.options(
        selectinload(Engagement.customer),
        selectinload(Engagement.created_by)
    )

    result = await db.execute(query)
    engagements = result.scalars().all()

    return EngagementListResponse(
        items=[EngagementResponse.model_validate(e) for e in engagements],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{engagement_id}", response_model=EngagementResponse)
async def get_engagement(engagement_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single engagement."""
    query = select(Engagement).where(Engagement.id == engagement_id).options(
        selectinload(Engagement.customer),
        selectinload(Engagement.created_by)
    )
    result = await db.execute(query)
    engagement = result.scalar_one_or_none()

    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    return EngagementResponse.model_validate(engagement)


@router.post("", response_model=EngagementResponse, status_code=201)
async def create_engagement(
    engagement_in: EngagementCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new engagement."""
    engagement = Engagement(**engagement_in.model_dump())
    db.add(engagement)
    await db.flush()
    await db.refresh(engagement)
    return EngagementResponse.model_validate(engagement)


@router.patch("/{engagement_id}", response_model=EngagementResponse)
async def update_engagement(
    engagement_id: int,
    engagement_in: EngagementUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update an engagement."""
    query = select(Engagement).where(Engagement.id == engagement_id)
    result = await db.execute(query)
    engagement = result.scalar_one_or_none()

    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    update_data = engagement_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(engagement, field, value)

    await db.flush()
    await db.refresh(engagement)
    return EngagementResponse.model_validate(engagement)


@router.delete("/{engagement_id}", status_code=204)
async def delete_engagement(engagement_id: int, db: AsyncSession = Depends(get_db)):
    """Delete an engagement."""
    query = select(Engagement).where(Engagement.id == engagement_id)
    result = await db.execute(query)
    engagement = result.scalar_one_or_none()

    if not engagement:
        raise HTTPException(status_code=404, detail="Engagement not found")

    await db.delete(engagement)
