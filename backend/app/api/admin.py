"""
Admin API endpoints for data management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, delete
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.models.customer import Customer, Contact
from app.models.task import Task
from app.models.engagement import Engagement
from app.models.user import User
from app.models.partner import Partner, PartnerUser
from app.models.use_case import UseCase, CustomerUseCase
from app.models.roadmap import Roadmap, RoadmapItem

router = APIRouter()


class DataStats(BaseModel):
    """Response model for data statistics."""
    users: int
    customers: int
    contacts: int
    tasks: int
    engagements: int
    partners: int
    use_cases: int
    customer_use_cases: int
    roadmaps: int
    roadmap_items: int


class ClearDataRequest(BaseModel):
    """Request model for clearing data."""
    confirm: bool = False
    keep_users: bool = True


class ClearDataResponse(BaseModel):
    """Response model for clear data operation."""
    success: bool
    message: str
    deleted: dict


@router.get("/stats", response_model=DataStats)
async def get_data_stats(db: AsyncSession = Depends(get_db)):
    """Get statistics about current data in the database."""
    stats = {}

    tables = [
        ("users", "users"),
        ("customers", "customers"),
        ("contacts", "contacts"),
        ("tasks", "tasks"),
        ("engagements", "engagements"),
        ("partners", "partners"),
        ("use_cases", "use_cases"),
        ("customer_use_cases", "customer_use_cases"),
        ("roadmaps", "roadmaps"),
        ("roadmap_items", "roadmap_items"),
    ]

    for key, table in tables:
        result = await db.execute(text(f"SELECT COUNT(*) FROM {table}"))
        stats[key] = result.scalar() or 0

    return DataStats(**stats)


@router.post("/clear-data", response_model=ClearDataResponse)
async def clear_test_data(
    request: ClearDataRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Clear all test data from the database.

    Set confirm=true to actually delete data.
    Set keep_users=true to preserve user accounts.
    """
    if not request.confirm:
        raise HTTPException(
            status_code=400,
            detail="Must set confirm=true to clear data. This action is irreversible."
        )

    deleted = {}

    # Delete in order respecting foreign key constraints
    # (child tables first, then parent tables)

    # Roadmap items first (depends on roadmaps)
    result = await db.execute(delete(RoadmapItem))
    deleted["roadmap_items"] = result.rowcount

    # Roadmaps (depends on customers and users)
    result = await db.execute(delete(Roadmap))
    deleted["roadmaps"] = result.rowcount

    # Customer use cases (depends on customers and use_cases)
    result = await db.execute(delete(CustomerUseCase))
    deleted["customer_use_cases"] = result.rowcount

    # Use cases
    result = await db.execute(delete(UseCase))
    deleted["use_cases"] = result.rowcount

    # Engagements (depends on customers and users)
    result = await db.execute(delete(Engagement))
    deleted["engagements"] = result.rowcount

    # Tasks (depends on customers and users)
    result = await db.execute(delete(Task))
    deleted["tasks"] = result.rowcount

    # Contacts (depends on customers)
    result = await db.execute(delete(Contact))
    deleted["contacts"] = result.rowcount

    # Customers (depends on users and partners)
    result = await db.execute(delete(Customer))
    deleted["customers"] = result.rowcount

    # Partner users (depends on partners and users)
    result = await db.execute(delete(PartnerUser))
    deleted["partner_users"] = result.rowcount

    # Partners
    result = await db.execute(delete(Partner))
    deleted["partners"] = result.rowcount

    # Users (optionally keep)
    if not request.keep_users:
        result = await db.execute(delete(User))
        deleted["users"] = result.rowcount
    else:
        deleted["users"] = 0

    await db.commit()

    total = sum(deleted.values())
    return ClearDataResponse(
        success=True,
        message=f"Successfully deleted {total} records",
        deleted=deleted
    )


@router.post("/reseed")
async def reseed_data(db: AsyncSession = Depends(get_db)):
    """
    Reseed the database with sample data.
    Note: This will only work if the database is empty or has only users.
    """
    from app.db_init import seed_data

    # Check if there's already customer data
    result = await db.execute(text("SELECT COUNT(*) FROM customers"))
    count = result.scalar()

    if count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Database already has {count} customers. Clear data first before reseeding."
        )

    # Import and run the seed function
    try:
        await seed_data()
        return {"success": True, "message": "Database reseeded with sample data"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reseed data: {str(e)}"
        )


@router.post("/migrate")
async def run_migrations(db: AsyncSession = Depends(get_db)):
    """
    Run database migrations to add new columns.
    This is safe to run multiple times - it checks if columns exist first.
    """
    migrations_run = []

    # Migration: Add partner fields to users table
    try:
        # Check if is_partner_user column exists
        result = await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'is_partner_user'
        """))
        if not result.scalar():
            await db.execute(text("""
                ALTER TABLE users
                ADD COLUMN is_partner_user BOOLEAN DEFAULT FALSE
            """))
            migrations_run.append("Added is_partner_user column to users table")

        # Check if partner_id column exists
        result = await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'partner_id'
        """))
        if not result.scalar():
            await db.execute(text("""
                ALTER TABLE users
                ADD COLUMN partner_id INTEGER REFERENCES partners(id)
            """))
            migrations_run.append("Added partner_id column to users table")

        await db.commit()

        if migrations_run:
            return {"success": True, "message": "Migrations completed", "migrations": migrations_run}
        else:
            return {"success": True, "message": "No migrations needed - database is up to date", "migrations": []}

    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Migration failed: {str(e)}"
        )
