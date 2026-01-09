from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional, List

from app.core.database import get_db
from app.models.use_case import UseCase, CustomerUseCase, UseCaseStatus
from app.schemas.use_case import (
    UseCaseCreate, UseCaseResponse, UseCaseListResponse,
    CustomerUseCaseUpdate, CustomerUseCaseResponse
)

router = APIRouter()


@router.get("", response_model=UseCaseListResponse)
async def list_use_cases(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    solution_area: Optional[str] = None,
    domain: Optional[str] = None,
    category: Optional[str] = None,
    is_active: bool = True,
):
    """List master use case definitions."""
    query = select(UseCase).where(UseCase.is_active == is_active)

    if solution_area:
        query = query.where(UseCase.solution_area == solution_area)

    if domain:
        query = query.where(UseCase.domain == domain)

    if category:
        query = query.where(UseCase.category == category)

    query = query.order_by(UseCase.solution_area, UseCase.domain, UseCase.display_order, UseCase.name)

    count_query = select(func.count()).select_from(UseCase).where(UseCase.is_active == is_active)
    total = await db.scalar(count_query)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    use_cases = result.scalars().all()

    return UseCaseListResponse(
        items=[UseCaseResponse.model_validate(u) for u in use_cases],
        total=total,
        skip=skip,
        limit=limit
    )


@router.post("", response_model=UseCaseResponse, status_code=201)
async def create_use_case(use_case_in: UseCaseCreate, db: AsyncSession = Depends(get_db)):
    """Create a new use case definition (admin only)."""
    use_case = UseCase(**use_case_in.model_dump())
    db.add(use_case)
    await db.flush()
    await db.refresh(use_case)
    return UseCaseResponse.model_validate(use_case)


@router.get("/{use_case_id}", response_model=UseCaseResponse)
async def get_use_case(use_case_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single use case definition."""
    use_case = await db.get(UseCase, use_case_id)

    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    return UseCaseResponse.model_validate(use_case)


@router.patch("/{use_case_id}", response_model=UseCaseResponse)
async def update_use_case(use_case_id: int, use_case_in: UseCaseCreate, db: AsyncSession = Depends(get_db)):
    """Update a use case definition (admin only)."""
    use_case = await db.get(UseCase, use_case_id)

    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    # Update fields
    for field, value in use_case_in.model_dump(exclude_unset=True).items():
        setattr(use_case, field, value)

    await db.flush()
    await db.refresh(use_case)
    return UseCaseResponse.model_validate(use_case)


@router.delete("/{use_case_id}", status_code=204)
async def delete_use_case(use_case_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a use case definition (admin only). Also deletes customer tracking for this use case."""
    use_case = await db.get(UseCase, use_case_id)

    if not use_case:
        raise HTTPException(status_code=404, detail="Use case not found")

    # Delete customer use case records first
    await db.execute(
        CustomerUseCase.__table__.delete().where(CustomerUseCase.use_case_id == use_case_id)
    )

    # Delete the use case
    await db.delete(use_case)
    await db.flush()
    return None


# Customer-specific use case tracking
@router.get("/customer/{customer_id}", response_model=List[CustomerUseCaseResponse])
async def get_customer_use_cases(customer_id: int, db: AsyncSession = Depends(get_db)):
    """Get use case statuses for a specific customer."""
    # Get all use cases with customer status if exists
    query = select(UseCase).where(UseCase.is_active == True).order_by(
        UseCase.category, UseCase.display_order
    )
    result = await db.execute(query)
    all_use_cases = result.scalars().all()

    # Get customer's use case statuses
    status_query = select(CustomerUseCase).where(CustomerUseCase.customer_id == customer_id)
    status_result = await db.execute(status_query)
    customer_statuses = {cuc.use_case_id: cuc for cuc in status_result.scalars().all()}

    # Combine
    response = []
    for uc in all_use_cases:
        if uc.id in customer_statuses:
            cuc = customer_statuses[uc.id]
            response.append(CustomerUseCaseResponse(
                id=cuc.id,
                use_case_id=uc.id,
                customer_id=customer_id,
                name=uc.name,
                solution_area=uc.solution_area,
                domain=uc.domain,
                category=uc.category,
                status=cuc.status,
                notes=cuc.notes,
                updated_at=cuc.updated_at
            ))
        else:
            response.append(CustomerUseCaseResponse(
                id=None,
                use_case_id=uc.id,
                customer_id=customer_id,
                name=uc.name,
                solution_area=uc.solution_area,
                domain=uc.domain,
                category=uc.category,
                status=UseCaseStatus.NOT_STARTED,
                notes=None,
                updated_at=None
            ))

    return response


@router.put("/customer/{customer_id}/{use_case_id}", response_model=CustomerUseCaseResponse)
async def update_customer_use_case(
    customer_id: int,
    use_case_id: int,
    update_in: CustomerUseCaseUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update use case status for a customer."""
    # Check if record exists
    query = select(CustomerUseCase).where(
        CustomerUseCase.customer_id == customer_id,
        CustomerUseCase.use_case_id == use_case_id
    )
    result = await db.execute(query)
    cuc = result.scalar_one_or_none()

    if cuc:
        # Update existing
        for field, value in update_in.model_dump(exclude_unset=True).items():
            setattr(cuc, field, value)
    else:
        # Create new
        cuc = CustomerUseCase(
            customer_id=customer_id,
            use_case_id=use_case_id,
            **update_in.model_dump()
        )
        db.add(cuc)

    await db.flush()
    await db.refresh(cuc)

    # Get use case details
    use_case = await db.get(UseCase, use_case_id)

    return CustomerUseCaseResponse(
        id=cuc.id,
        use_case_id=use_case_id,
        customer_id=customer_id,
        name=use_case.name,
        solution_area=use_case.solution_area,
        domain=use_case.domain,
        category=use_case.category,
        status=cuc.status,
        notes=cuc.notes,
        updated_at=cuc.updated_at
    )
