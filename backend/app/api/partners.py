from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List

from app.core.database import get_db
from app.models.partner import Partner, PartnerUser
from app.schemas.partner import (
    PartnerCreate, PartnerUpdate, PartnerResponse, PartnerListResponse,
    PartnerUserCreate, PartnerUserResponse
)

router = APIRouter()


@router.get("", response_model=PartnerListResponse)
async def list_partners(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_active: Optional[bool] = True,
):
    """List partner organizations."""
    query = select(Partner)

    if is_active is not None:
        query = query.where(Partner.is_active == is_active)

    query = query.order_by(Partner.name)

    count_query = select(func.count()).select_from(Partner)
    total = await db.scalar(count_query)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    partners = result.scalars().all()

    return PartnerListResponse(
        items=[PartnerResponse.model_validate(p) for p in partners],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{partner_id}", response_model=PartnerResponse)
async def get_partner(partner_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single partner."""
    query = select(Partner).where(Partner.id == partner_id).options(
        selectinload(Partner.users)
    )
    result = await db.execute(query)
    partner = result.scalar_one_or_none()

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    return PartnerResponse.model_validate(partner)


@router.post("", response_model=PartnerResponse, status_code=201)
async def create_partner(partner_in: PartnerCreate, db: AsyncSession = Depends(get_db)):
    """Create a new partner organization."""
    # Check for duplicate name or code
    existing = await db.execute(
        select(Partner).where((Partner.name == partner_in.name) | (Partner.code == partner_in.code))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Partner with this name or code already exists")

    partner = Partner(**partner_in.model_dump())
    db.add(partner)
    await db.flush()
    await db.refresh(partner)
    return PartnerResponse.model_validate(partner)


@router.patch("/{partner_id}", response_model=PartnerResponse)
async def update_partner(
    partner_id: int,
    partner_in: PartnerUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a partner organization."""
    partner = await db.get(Partner, partner_id)

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    update_data = partner_in.model_dump(exclude_unset=True)

    # Check for duplicate name or code if being updated
    if 'name' in update_data or 'code' in update_data:
        check_name = update_data.get('name', partner.name)
        check_code = update_data.get('code', partner.code)
        existing = await db.execute(
            select(Partner).where(
                (Partner.id != partner_id) &
                ((Partner.name == check_name) | (Partner.code == check_code))
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Partner with this name or code already exists")

    for field, value in update_data.items():
        setattr(partner, field, value)

    await db.flush()
    await db.refresh(partner)
    return PartnerResponse.model_validate(partner)


@router.delete("/{partner_id}", status_code=204)
async def delete_partner(partner_id: int, db: AsyncSession = Depends(get_db)):
    """Deactivate a partner organization (soft delete)."""
    partner = await db.get(Partner, partner_id)

    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    partner.is_active = False
    await db.flush()


# Partner Users
@router.get("/{partner_id}/users", response_model=List[PartnerUserResponse])
async def list_partner_users(partner_id: int, db: AsyncSession = Depends(get_db)):
    """List users for a partner organization."""
    query = select(PartnerUser).where(PartnerUser.partner_id == partner_id)
    result = await db.execute(query)
    users = result.scalars().all()
    return [PartnerUserResponse.model_validate(u) for u in users]


@router.post("/{partner_id}/users", response_model=PartnerUserResponse, status_code=201)
async def create_partner_user(
    partner_id: int,
    user_in: PartnerUserCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a user to a partner organization."""
    # Verify partner exists
    partner = await db.get(Partner, partner_id)
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")

    user = PartnerUser(partner_id=partner_id, **user_in.model_dump())
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return PartnerUserResponse.model_validate(user)
