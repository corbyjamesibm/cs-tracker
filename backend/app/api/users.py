from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserResponse, UserListResponse

router = APIRouter()


@router.get("", response_model=UserListResponse)
async def list_users(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = True,
    is_partner_user: Optional[bool] = None,
):
    """List users with filtering."""
    query = select(User).options(selectinload(User.partner))

    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    if is_partner_user is not None:
        query = query.where(User.is_partner_user == is_partner_user)

    query = query.order_by(User.last_name, User.first_name)

    # Count
    count_query = select(func.count()).select_from(User)
    if is_active is not None:
        count_query = count_query.where(User.is_active == is_active)
    total = await db.scalar(count_query)

    # Pagination
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    users = result.scalars().all()

    return UserListResponse(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(db: AsyncSession = Depends(get_db)):
    """Get current authenticated user."""
    # TODO: Implement actual auth - for now return first user
    query = select(User).limit(1)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="No users found")

    return UserResponse.model_validate(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single user."""
    query = select(User).where(User.id == user_id).options(selectinload(User.partner))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse.model_validate(user)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    """Create a new user."""
    # Check email uniqueness
    existing = await db.execute(select(User).where(User.email == user_in.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # Validate partner fields
    if user_in.is_partner_user and not user_in.partner_id:
        raise HTTPException(status_code=400, detail="Partner ID is required for partner users")

    user = User(**user_in.model_dump())
    db.add(user)
    await db.flush()

    # Reload with partner relationship
    query = select(User).where(User.id == user.id).options(selectinload(User.partner))
    result = await db.execute(query)
    user = result.scalar_one()

    return UserResponse.model_validate(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_in: UserUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a user."""
    query = select(User).where(User.id == user_id).options(selectinload(User.partner))
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = user_in.model_dump(exclude_unset=True)

    # Validate partner fields
    new_is_partner = update_data.get('is_partner_user', user.is_partner_user)
    new_partner_id = update_data.get('partner_id', user.partner_id)
    if new_is_partner and not new_partner_id:
        raise HTTPException(status_code=400, detail="Partner ID is required for partner users")

    # If setting is_partner_user to False, clear partner_id
    if 'is_partner_user' in update_data and not update_data['is_partner_user']:
        update_data['partner_id'] = None

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()

    # Reload with partner relationship
    query = select(User).where(User.id == user.id).options(selectinload(User.partner))
    result = await db.execute(query)
    user = result.scalar_one()

    return UserResponse.model_validate(user)


@router.delete("/{user_id}", status_code=204)
async def deactivate_user(user_id: int, db: AsyncSession = Depends(get_db)):
    """Deactivate a user (soft delete)."""
    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_active = False
    await db.flush()
