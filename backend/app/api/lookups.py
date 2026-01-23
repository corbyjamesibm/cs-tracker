from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, distinct
from typing import Optional, List

from app.core.database import get_db
from app.models.lookup import LookupValue
from app.schemas.lookup import (
    LookupValueCreate, LookupValueUpdate, LookupValueResponse,
    LookupValueListResponse, LookupCategoryResponse, LookupCategoriesResponse
)

router = APIRouter()


# Predefined categories with default values
DEFAULT_CATEGORIES = {
    "industry": [
        {"value": "financial_services", "label": "Financial Services"},
        {"value": "healthcare", "label": "Healthcare"},
        {"value": "technology", "label": "Technology"},
        {"value": "manufacturing", "label": "Manufacturing"},
        {"value": "retail", "label": "Retail"},
        {"value": "energy", "label": "Energy"},
        {"value": "telecommunications", "label": "Telecommunications"},
        {"value": "government", "label": "Government"},
        {"value": "education", "label": "Education"},
        {"value": "other", "label": "Other"},
    ],
    "employee_count": [
        {"value": "1-50", "label": "1-50"},
        {"value": "51-200", "label": "51-200"},
        {"value": "201-500", "label": "201-500"},
        {"value": "501-1000", "label": "501-1000"},
        {"value": "1001-5000", "label": "1,001-5,000"},
        {"value": "5001-10000", "label": "5,001-10,000"},
        {"value": "10000+", "label": "10,000+"},
    ],
    "solution_area": [
        {"value": "WFM", "label": "WFM - Workforce Management"},
        {"value": "HPM", "label": "HPM - Hybrid Portfolio Management"},
        {"value": "EAP", "label": "EAP - Enterprise Agile Planning"},
        {"value": "POM", "label": "POM - Product Operating Model"},
        {"value": "FPM", "label": "FPM - Financial Portfolio Management"},
    ],
    "domain": [
        {"value": "Strategic Planning", "label": "Strategic Planning"},
        {"value": "Portfolio Management", "label": "Portfolio Management"},
        {"value": "Capacity Management", "label": "Capacity Management"},
        {"value": "Resource Management", "label": "Resource Management"},
        {"value": "Financial Management", "label": "Financial Management"},
        {"value": "Demand Management", "label": "Demand Management"},
        {"value": "Agile Delivery", "label": "Agile Delivery"},
    ],
    "task_category": [
        {"value": "onboarding", "label": "Onboarding"},
        {"value": "training", "label": "Training"},
        {"value": "support", "label": "Support"},
        {"value": "review", "label": "Review"},
        {"value": "planning", "label": "Planning"},
        {"value": "other", "label": "Other"},
    ],
}


@router.get("/categories", response_model=LookupCategoriesResponse)
async def list_categories(db: AsyncSession = Depends(get_db)):
    """List all available lookup categories."""
    # Get categories from database
    query = select(distinct(LookupValue.category))
    result = await db.execute(query)
    db_categories = [row[0] for row in result.all()]

    # Combine with default categories
    all_categories = set(db_categories) | set(DEFAULT_CATEGORIES.keys())

    return LookupCategoriesResponse(categories=sorted(list(all_categories)))


@router.get("/category/{category}", response_model=LookupCategoryResponse)
async def get_category_values(
    category: str,
    include_inactive: bool = Query(False),
    db: AsyncSession = Depends(get_db)
):
    """Get all values for a specific category."""
    query = select(LookupValue).where(LookupValue.category == category)
    if not include_inactive:
        query = query.where(LookupValue.is_active == True)
    query = query.order_by(LookupValue.display_order, LookupValue.label)

    result = await db.execute(query)
    values = result.scalars().all()

    # If no values in database, return defaults
    if not values and category in DEFAULT_CATEGORIES:
        return LookupCategoryResponse(
            category=category,
            values=[
                LookupValueResponse(
                    id=0,
                    category=category,
                    value=item["value"],
                    label=item["label"],
                    description=None,
                    display_order=idx,
                    is_active=True,
                    created_at=None,
                    updated_at=None
                )
                for idx, item in enumerate(DEFAULT_CATEGORIES[category])
            ]
        )

    return LookupCategoryResponse(
        category=category,
        values=[LookupValueResponse.model_validate(v) for v in values]
    )


@router.get("", response_model=LookupValueListResponse)
async def list_lookup_values(
    db: AsyncSession = Depends(get_db),
    category: Optional[str] = None,
    include_inactive: bool = Query(False),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    """List all lookup values with optional category filter."""
    query = select(LookupValue)

    if category:
        query = query.where(LookupValue.category == category)
    if not include_inactive:
        query = query.where(LookupValue.is_active == True)

    # Count total
    count_query = select(func.count()).select_from(LookupValue)
    if category:
        count_query = count_query.where(LookupValue.category == category)
    if not include_inactive:
        count_query = count_query.where(LookupValue.is_active == True)
    total = await db.scalar(count_query)

    # Pagination and ordering
    query = query.order_by(LookupValue.category, LookupValue.display_order, LookupValue.label)
    query = query.offset(skip).limit(limit)

    result = await db.execute(query)
    values = result.scalars().all()

    return LookupValueListResponse(
        items=[LookupValueResponse.model_validate(v) for v in values],
        total=total
    )


@router.post("", response_model=LookupValueResponse, status_code=201)
async def create_lookup_value(
    value_in: LookupValueCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new lookup value."""
    # Check if value already exists in this category
    existing = await db.execute(
        select(LookupValue).where(
            LookupValue.category == value_in.category,
            LookupValue.value == value_in.value
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=400,
            detail=f"Value '{value_in.value}' already exists in category '{value_in.category}'"
        )

    lookup = LookupValue(**value_in.model_dump())
    db.add(lookup)
    await db.commit()
    await db.refresh(lookup)

    return LookupValueResponse.model_validate(lookup)


@router.patch("/{lookup_id}", response_model=LookupValueResponse)
async def update_lookup_value(
    lookup_id: int,
    value_in: LookupValueUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a lookup value."""
    lookup = await db.get(LookupValue, lookup_id)
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup value not found")

    update_data = value_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lookup, field, value)

    await db.commit()
    await db.refresh(lookup)

    return LookupValueResponse.model_validate(lookup)


@router.delete("/{lookup_id}", status_code=204)
async def delete_lookup_value(
    lookup_id: int,
    db: AsyncSession = Depends(get_db)
):
    """Delete a lookup value."""
    lookup = await db.get(LookupValue, lookup_id)
    if not lookup:
        raise HTTPException(status_code=404, detail="Lookup value not found")

    await db.delete(lookup)
    await db.commit()


@router.post("/initialize/{category}", response_model=LookupCategoryResponse)
async def initialize_category(
    category: str,
    db: AsyncSession = Depends(get_db)
):
    """Initialize a category with default values (only if empty)."""
    if category not in DEFAULT_CATEGORIES:
        raise HTTPException(status_code=400, detail=f"Unknown category: {category}")

    # Check if category already has values
    existing = await db.execute(
        select(func.count()).select_from(LookupValue).where(LookupValue.category == category)
    )
    if existing.scalar() > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Category '{category}' already has values. Delete them first to reinitialize."
        )

    # Create default values
    values = []
    for idx, item in enumerate(DEFAULT_CATEGORIES[category]):
        lookup = LookupValue(
            category=category,
            value=item["value"],
            label=item["label"],
            display_order=idx,
            is_active=True
        )
        db.add(lookup)
        values.append(lookup)

    await db.commit()
    for v in values:
        await db.refresh(v)

    return LookupCategoryResponse(
        category=category,
        values=[LookupValueResponse.model_validate(v) for v in values]
    )
