from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date

from app.core.database import get_db
from app.models.roadmap import Roadmap, RoadmapItem, RoadmapUpdate, RoadmapItemStatus
from app.schemas.roadmap import (
    RoadmapCreate, RoadmapResponse, RoadmapItemCreate, RoadmapItemUpdate,
    RoadmapItemResponse, RoadmapUpdateCreate, RoadmapUpdateResponse
)

router = APIRouter()


@router.get("/customer/{customer_id}", response_model=Optional[RoadmapResponse])
async def get_customer_roadmap(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get the active roadmap for a customer."""
    query = select(Roadmap).where(
        Roadmap.customer_id == customer_id,
        Roadmap.is_active == True
    ).options(selectinload(Roadmap.items))

    result = await db.execute(query)
    roadmap = result.scalar_one_or_none()

    if not roadmap:
        return None

    return RoadmapResponse.model_validate(roadmap)


@router.post("", response_model=RoadmapResponse, status_code=201)
async def create_roadmap(roadmap_in: RoadmapCreate, db: AsyncSession = Depends(get_db)):
    """Create a new roadmap for a customer."""
    # Deactivate existing roadmaps for this customer
    existing_query = select(Roadmap).where(
        Roadmap.customer_id == roadmap_in.customer_id,
        Roadmap.is_active == True
    )
    result = await db.execute(existing_query)
    existing = result.scalars().all()
    for r in existing:
        r.is_active = False

    roadmap = Roadmap(**roadmap_in.model_dump())
    db.add(roadmap)
    await db.flush()
    await db.refresh(roadmap)

    return RoadmapResponse.model_validate(roadmap)


@router.get("/{roadmap_id}", response_model=RoadmapResponse)
async def get_roadmap(roadmap_id: int, db: AsyncSession = Depends(get_db)):
    """Get a roadmap by ID."""
    query = select(Roadmap).where(Roadmap.id == roadmap_id).options(
        selectinload(Roadmap.items)
    )
    result = await db.execute(query)
    roadmap = result.scalar_one_or_none()

    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    return RoadmapResponse.model_validate(roadmap)


# Roadmap Items
@router.post("/{roadmap_id}/items", response_model=RoadmapItemResponse, status_code=201)
async def add_roadmap_item(
    roadmap_id: int,
    item_in: RoadmapItemCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add an item to a roadmap."""
    roadmap = await db.get(Roadmap, roadmap_id)
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    item = RoadmapItem(roadmap_id=roadmap_id, **item_in.model_dump())
    db.add(item)
    await db.flush()
    await db.refresh(item)

    return RoadmapItemResponse.model_validate(item)


@router.patch("/items/{item_id}", response_model=RoadmapItemResponse)
async def update_roadmap_item(
    item_id: int,
    item_in: RoadmapItemUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a roadmap item."""
    item = await db.get(RoadmapItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    await db.flush()
    await db.refresh(item)

    return RoadmapItemResponse.model_validate(item)


@router.delete("/items/{item_id}", status_code=204)
async def delete_roadmap_item(item_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a roadmap item."""
    item = await db.get(RoadmapItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    await db.delete(item)


# Quarterly Updates
@router.post("/items/{item_id}/updates", response_model=RoadmapUpdateResponse, status_code=201)
async def add_quarterly_update(
    item_id: int,
    update_in: RoadmapUpdateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a quarterly update to a roadmap item."""
    item = await db.get(RoadmapItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Roadmap item not found")

    update = RoadmapUpdate(
        roadmap_item_id=item_id,
        quarter=update_in.quarter,
        update_text=update_in.update_text,
        status_at_update=item.status,
        progress_at_update=item.progress_percent
    )
    db.add(update)

    # Also update the item's last_update field
    item.last_update = update_in.update_text

    await db.flush()
    await db.refresh(update)

    return RoadmapUpdateResponse.model_validate(update)


@router.get("/items/{item_id}/updates", response_model=List[RoadmapUpdateResponse])
async def get_item_updates(item_id: int, db: AsyncSession = Depends(get_db)):
    """Get all quarterly updates for a roadmap item."""
    query = select(RoadmapUpdate).where(
        RoadmapUpdate.roadmap_item_id == item_id
    ).order_by(RoadmapUpdate.created_at.desc())

    result = await db.execute(query)
    updates = result.scalars().all()

    return [RoadmapUpdateResponse.model_validate(u) for u in updates]
