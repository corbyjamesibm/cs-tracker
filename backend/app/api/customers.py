from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import date

from app.core.database import get_db
from app.models.customer import Customer, HealthStatus, AdoptionStage, Contact
from app.schemas.customer import (
    CustomerCreate, CustomerUpdate, CustomerResponse, CustomerListResponse,
    CustomerDetailResponse, ContactCreate, ContactResponse
)

router = APIRouter()


@router.get("", response_model=CustomerListResponse)
async def list_customers(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    health_status: Optional[HealthStatus] = None,
    csm_owner_id: Optional[int] = None,
    search: Optional[str] = None,
    sort_by: str = Query("name", regex="^(name|arr|renewal_date|health_status|created_at)$"),
    sort_order: str = Query("asc", regex="^(asc|desc)$"),
):
    """List all customers with filtering and pagination."""
    query = select(Customer)

    # Filters
    if health_status:
        query = query.where(Customer.health_status == health_status)
    if csm_owner_id:
        query = query.where(Customer.csm_owner_id == csm_owner_id)
    if search:
        query = query.where(Customer.name.ilike(f"%{search}%"))

    # Sorting
    sort_column = getattr(Customer, sort_by)
    if sort_order == "desc":
        sort_column = sort_column.desc()
    query = query.order_by(sort_column)

    # Count total
    count_query = select(func.count()).select_from(Customer)
    if health_status:
        count_query = count_query.where(Customer.health_status == health_status)
    if csm_owner_id:
        count_query = count_query.where(Customer.csm_owner_id == csm_owner_id)
    if search:
        count_query = count_query.where(Customer.name.ilike(f"%{search}%"))
    total = await db.scalar(count_query)

    # Pagination
    query = query.offset(skip).limit(limit)
    query = query.options(selectinload(Customer.csm_owner))

    result = await db.execute(query)
    customers = result.scalars().all()

    return CustomerListResponse(
        items=[CustomerResponse.model_validate(c) for c in customers],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{customer_id}", response_model=CustomerDetailResponse)
async def get_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single customer with full details."""
    query = select(Customer).where(Customer.id == customer_id).options(
        selectinload(Customer.csm_owner),
        selectinload(Customer.partner),
        selectinload(Customer.contacts),
        selectinload(Customer.tasks),
        selectinload(Customer.use_cases),
    )
    result = await db.execute(query)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    return CustomerDetailResponse.model_validate(customer)


@router.post("", response_model=CustomerResponse, status_code=201)
async def create_customer(customer_in: CustomerCreate, db: AsyncSession = Depends(get_db)):
    """Create a new customer."""
    customer = Customer(**customer_in.model_dump())
    db.add(customer)
    await db.flush()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: int,
    customer_in: CustomerUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a customer."""
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    update_data = customer_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(customer, field, value)

    await db.flush()
    await db.refresh(customer)
    return CustomerResponse.model_validate(customer)


@router.delete("/{customer_id}", status_code=204)
async def delete_customer(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a customer."""
    query = select(Customer).where(Customer.id == customer_id)
    result = await db.execute(query)
    customer = result.scalar_one_or_none()

    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    await db.delete(customer)


# Contacts
@router.post("/{customer_id}/contacts", response_model=ContactResponse, status_code=201)
async def add_contact(
    customer_id: int,
    contact_in: ContactCreate,
    db: AsyncSession = Depends(get_db)
):
    """Add a contact to a customer."""
    # Verify customer exists
    customer = await db.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    contact = Contact(customer_id=customer_id, **contact_in.model_dump())
    db.add(contact)
    await db.flush()
    await db.refresh(contact)
    return ContactResponse.model_validate(contact)


@router.get("/{customer_id}/contacts", response_model=List[ContactResponse])
async def list_contacts(customer_id: int, db: AsyncSession = Depends(get_db)):
    """List contacts for a customer."""
    query = select(Contact).where(Contact.customer_id == customer_id)
    result = await db.execute(query)
    contacts = result.scalars().all()
    return [ContactResponse.model_validate(c) for c in contacts]
