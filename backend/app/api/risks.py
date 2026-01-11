from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case
from sqlalchemy.orm import selectinload
from typing import Optional
from datetime import datetime

from app.core.database import get_db
from app.models.risk import Risk, RiskSeverity, RiskStatus, RiskCategory
from app.schemas.risk import (
    RiskCreate, RiskUpdate, RiskResolve, RiskResponse,
    RiskListResponse, RiskSummaryResponse
)

router = APIRouter()


@router.get("/summary", response_model=RiskSummaryResponse)
async def get_risk_summary(db: AsyncSession = Depends(get_db)):
    """Get risk summary counts for dashboard."""
    # Total open risks
    total_open = await db.scalar(
        select(func.count()).select_from(Risk).where(
            Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING])
        )
    )

    # By severity (open risks only)
    by_severity = {}
    for severity in RiskSeverity:
        count = await db.scalar(
            select(func.count()).select_from(Risk).where(
                and_(
                    Risk.severity == severity,
                    Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING])
                )
            )
        )
        by_severity[severity.value] = count

    # By status
    by_status = {}
    for status in RiskStatus:
        count = await db.scalar(
            select(func.count()).select_from(Risk).where(Risk.status == status)
        )
        by_status[status.value] = count

    # Overdue count
    now = datetime.utcnow()
    overdue_count = await db.scalar(
        select(func.count()).select_from(Risk).where(
            and_(
                Risk.due_date < now,
                Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING])
            )
        )
    )

    return RiskSummaryResponse(
        total_open=total_open or 0,
        by_severity=by_severity,
        by_status=by_status,
        overdue_count=overdue_count or 0
    )


@router.get("", response_model=RiskListResponse)
async def list_risks(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    customer_id: Optional[int] = None,
    status: Optional[RiskStatus] = None,
    severity: Optional[RiskSeverity] = None,
    category: Optional[RiskCategory] = None,
    owner_id: Optional[int] = None,
    open_only: bool = Query(False, description="Only show open/mitigating risks"),
):
    """List risks with filtering."""
    query = select(Risk)

    # Filters
    if customer_id:
        query = query.where(Risk.customer_id == customer_id)
    if status:
        query = query.where(Risk.status == status)
    if severity:
        query = query.where(Risk.severity == severity)
    if category:
        query = query.where(Risk.category == category)
    if owner_id:
        query = query.where(Risk.owner_id == owner_id)
    if open_only:
        query = query.where(Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING]))

    # Order: critical first, then by severity, then by due date
    severity_order = case(
        (Risk.severity == RiskSeverity.CRITICAL, 1),
        (Risk.severity == RiskSeverity.HIGH, 2),
        (Risk.severity == RiskSeverity.MEDIUM, 3),
        (Risk.severity == RiskSeverity.LOW, 4),
        else_=5
    )
    query = query.order_by(severity_order, Risk.due_date.asc().nullslast())

    # Count total matching filters
    count_query = select(func.count()).select_from(Risk)
    if customer_id:
        count_query = count_query.where(Risk.customer_id == customer_id)
    if status:
        count_query = count_query.where(Risk.status == status)
    if severity:
        count_query = count_query.where(Risk.severity == severity)
    if open_only:
        count_query = count_query.where(Risk.status.in_([RiskStatus.OPEN, RiskStatus.MITIGATING]))
    total = await db.scalar(count_query)

    # Pagination and eager load
    query = query.offset(skip).limit(limit)
    query = query.options(
        selectinload(Risk.customer),
        selectinload(Risk.owner),
        selectinload(Risk.created_by)
    )

    result = await db.execute(query)
    risks = result.scalars().all()

    return RiskListResponse(
        items=[RiskResponse.model_validate(r) for r in risks],
        total=total or 0,
        skip=skip,
        limit=limit
    )


@router.get("/{risk_id}", response_model=RiskResponse)
async def get_risk(risk_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single risk."""
    query = select(Risk).where(Risk.id == risk_id).options(
        selectinload(Risk.customer),
        selectinload(Risk.owner),
        selectinload(Risk.created_by)
    )
    result = await db.execute(query)
    risk = result.scalar_one_or_none()

    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    return RiskResponse.model_validate(risk)


@router.post("", response_model=RiskResponse, status_code=201)
async def create_risk(risk_in: RiskCreate, db: AsyncSession = Depends(get_db)):
    """Create a new risk."""
    risk = Risk(**risk_in.model_dump())
    db.add(risk)
    await db.flush()

    # Eager load relationships for response
    query = select(Risk).where(Risk.id == risk.id).options(
        selectinload(Risk.customer),
        selectinload(Risk.owner),
        selectinload(Risk.created_by)
    )
    result = await db.execute(query)
    risk = result.scalar_one()

    return RiskResponse.model_validate(risk)


@router.patch("/{risk_id}", response_model=RiskResponse)
async def update_risk(
    risk_id: int,
    risk_in: RiskUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a risk."""
    query = select(Risk).where(Risk.id == risk_id)
    result = await db.execute(query)
    risk = result.scalar_one_or_none()

    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    update_data = risk_in.model_dump(exclude_unset=True)

    # Handle status changes to resolved/accepted
    if "status" in update_data and update_data["status"] in [RiskStatus.RESOLVED, RiskStatus.ACCEPTED]:
        if not risk.resolved_at:
            update_data["resolved_at"] = datetime.utcnow()

    for field, value in update_data.items():
        setattr(risk, field, value)

    await db.flush()

    # Reload with relationships
    query = select(Risk).where(Risk.id == risk_id).options(
        selectinload(Risk.customer),
        selectinload(Risk.owner),
        selectinload(Risk.created_by)
    )
    result = await db.execute(query)
    risk = result.scalar_one()

    return RiskResponse.model_validate(risk)


@router.post("/{risk_id}/resolve", response_model=RiskResponse)
async def resolve_risk(
    risk_id: int,
    resolve_data: RiskResolve,
    db: AsyncSession = Depends(get_db)
):
    """Mark a risk as resolved."""
    query = select(Risk).where(Risk.id == risk_id)
    result = await db.execute(query)
    risk = result.scalar_one_or_none()

    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    risk.status = RiskStatus.RESOLVED
    risk.resolved_at = datetime.utcnow()
    if resolve_data.resolution_notes:
        risk.resolution_notes = resolve_data.resolution_notes

    await db.flush()

    # Reload with relationships
    query = select(Risk).where(Risk.id == risk_id).options(
        selectinload(Risk.customer),
        selectinload(Risk.owner),
        selectinload(Risk.created_by)
    )
    result = await db.execute(query)
    risk = result.scalar_one()

    return RiskResponse.model_validate(risk)


@router.delete("/{risk_id}", status_code=204)
async def delete_risk(risk_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a risk."""
    query = select(Risk).where(Risk.id == risk_id)
    result = await db.execute(query)
    risk = result.scalar_one_or_none()

    if not risk:
        raise HTTPException(status_code=404, detail="Risk not found")

    await db.delete(risk)
