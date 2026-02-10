from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date
from collections import defaultdict

from app.core.database import get_db
from app.models.roadmap import Roadmap, RoadmapItem, RoadmapUpdate, RoadmapItemStatus, RoadmapItemCategory
from app.models.customer import Customer
from app.schemas.roadmap import (
    RoadmapCreate, RoadmapResponse, RoadmapItemCreate, RoadmapItemUpdate,
    RoadmapItemResponse, RoadmapUpdateCreate, RoadmapUpdateResponse,
    PortfolioRoadmapStatusResponse, PortfolioRoadmapItemResponse,
    StatusCount, CategoryCount, QuarterSummary
)

router = APIRouter()


@router.get("/portfolio-status", response_model=PortfolioRoadmapStatusResponse)
async def get_portfolio_roadmap_status(
    status: Optional[str] = Query(None, description="Filter by status (planned, in_progress, completed, delayed, cancelled)"),
    category: Optional[str] = Query(None, description="Filter by category (feature, enhancement, integration, migration, optimization, other)"),
    quarter: Optional[str] = Query(None, description="Filter by quarter (e.g., Q1 2026)"),
    db: AsyncSession = Depends(get_db)
):
    """Get portfolio-wide roadmap status report with all items across customers."""
    # Build query for all roadmap items from active roadmaps
    query = (
        select(RoadmapItem, Roadmap, Customer)
        .join(Roadmap, RoadmapItem.roadmap_id == Roadmap.id)
        .join(Customer, Roadmap.customer_id == Customer.id)
        .where(Roadmap.is_active == True)
    )

    # Apply filters
    if status:
        try:
            status_enum = RoadmapItemStatus(status)
            query = query.where(RoadmapItem.status == status_enum)
        except ValueError:
            pass  # Invalid status, ignore filter

    if category:
        try:
            category_enum = RoadmapItemCategory(category)
            query = query.where(RoadmapItem.category == category_enum)
        except ValueError:
            pass  # Invalid category, ignore filter

    if quarter:
        query = query.where(RoadmapItem.target_quarter == quarter)

    # Order by year, quarter, then display order
    query = query.order_by(RoadmapItem.target_year, RoadmapItem.target_quarter, RoadmapItem.display_order)

    result = await db.execute(query)
    rows = result.all()

    # Build response
    all_items = []
    status_counts = defaultdict(int)
    category_counts = defaultdict(int)
    quarters_data = defaultdict(lambda: {"items": [], "status_counts": defaultdict(int)})
    customer_ids = set()

    for item, roadmap, customer in rows:
        customer_ids.add(customer.id)

        # Build item response
        item_response = PortfolioRoadmapItemResponse(
            id=item.id,
            roadmap_id=item.roadmap_id,
            customer_id=customer.id,
            customer_name=customer.name,
            title=item.title,
            description=item.description,
            category=item.category,
            status=item.status,
            target_quarter=item.target_quarter,
            target_year=item.target_year,
            planned_start_date=item.planned_start_date,
            planned_end_date=item.planned_end_date,
            progress_percent=item.progress_percent,
            depends_on_ids=item.depends_on_ids or [],
            notes=item.notes,
            last_update=item.last_update,
            created_at=item.created_at,
            updated_at=item.updated_at
        )

        all_items.append(item_response)

        # Update counts
        status_counts[item.status.value] += 1
        category_counts[item.category.value] += 1

        # Group by quarter
        quarter_key = f"{item.target_quarter}_{item.target_year}"
        quarters_data[quarter_key]["items"].append(item_response)
        quarters_data[quarter_key]["quarter"] = item.target_quarter
        quarters_data[quarter_key]["year"] = item.target_year
        quarters_data[quarter_key]["status_counts"][item.status.value] += 1

    # Build quarter summaries
    quarter_summaries = []
    for quarter_key in sorted(quarters_data.keys(), key=lambda x: (int(x.split("_")[1]), x.split("_")[0])):
        data = quarters_data[quarter_key]
        sc = data["status_counts"]
        quarter_summaries.append(QuarterSummary(
            quarter=data["quarter"],
            year=data["year"],
            total_items=len(data["items"]),
            status_breakdown=StatusCount(
                planned=sc.get("planned", 0),
                in_progress=sc.get("in_progress", 0),
                completed=sc.get("completed", 0),
                delayed=sc.get("delayed", 0),
                cancelled=sc.get("cancelled", 0)
            ),
            items=data["items"]
        ))

    return PortfolioRoadmapStatusResponse(
        total_items=len(all_items),
        total_customers_with_roadmaps=len(customer_ids),
        status_counts=StatusCount(
            planned=status_counts.get("planned", 0),
            in_progress=status_counts.get("in_progress", 0),
            completed=status_counts.get("completed", 0),
            delayed=status_counts.get("delayed", 0),
            cancelled=status_counts.get("cancelled", 0)
        ),
        category_counts=CategoryCount(
            feature=category_counts.get("feature", 0),
            enhancement=category_counts.get("enhancement", 0),
            integration=category_counts.get("integration", 0),
            migration=category_counts.get("migration", 0),
            optimization=category_counts.get("optimization", 0),
            other=category_counts.get("other", 0)
        ),
        quarters=quarter_summaries,
        all_items=all_items
    )


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

    # Fetch with items loaded
    query = select(Roadmap).where(Roadmap.id == roadmap.id).options(
        selectinload(Roadmap.items)
    )
    result = await db.execute(query)
    roadmap = result.scalar_one()

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
