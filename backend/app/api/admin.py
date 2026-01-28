"""
Admin API endpoints for data management.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text, delete
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db, engine
from app.models.customer import Customer, Contact
from app.models.task import Task
from app.models.engagement import Engagement
from app.models.user import User
from app.models.partner import Partner, PartnerUser
from app.models.use_case import UseCase, CustomerUseCase
from app.models.roadmap import Roadmap, RoadmapItem
from app.models.settings import AppSetting, SettingValueType
from sqlalchemy import select
from typing import List

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

        # Check if password_hash column exists in users table
        result = await db.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'users' AND column_name = 'password_hash'
        """))
        if not result.scalar():
            await db.execute(text("""
                ALTER TABLE users
                ADD COLUMN password_hash VARCHAR(255)
            """))
            migrations_run.append("Added password_hash column to users table")

        # Check if app_settings table exists
        result = await db.execute(text("""
            SELECT table_name FROM information_schema.tables
            WHERE table_name = 'app_settings'
        """))
        if not result.scalar():
            await db.execute(text("""
                CREATE TABLE app_settings (
                    id SERIAL PRIMARY KEY,
                    key VARCHAR(100) UNIQUE NOT NULL,
                    value TEXT NOT NULL,
                    value_type VARCHAR(20) DEFAULT 'string',
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )
            """))
            migrations_run.append("Created app_settings table")

            # Seed default settings
            await db.execute(text("""
                INSERT INTO app_settings (key, value, value_type, description) VALUES
                ('auth_enabled', 'false', 'boolean', 'Enable authentication requirement for the application'),
                ('auth_default_method', 'w3id', 'string', 'Default authentication method (w3id or password)')
            """))
            migrations_run.append("Seeded default auth settings")

        await db.commit()

        # Migration: Add ACCOUNT_MANAGER to userrole enum (uppercase to match existing values)
        # Note: ALTER TYPE ... ADD VALUE cannot run in a transaction
        result = await db.execute(text("""
            SELECT enumlabel FROM pg_enum
            WHERE enumtypid = 'userrole'::regtype AND enumlabel = 'ACCOUNT_MANAGER'
        """))
        if not result.scalar():
            # ALTER TYPE ... ADD VALUE cannot run inside a transaction
            # Get raw asyncpg connection to execute outside transaction
            raw_conn = await engine.raw_connection()
            try:
                await raw_conn.execute(
                    "ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ACCOUNT_MANAGER'"
                )
                migrations_run.append("Added ACCOUNT_MANAGER to userrole enum")
            finally:
                await raw_conn.close()

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


# Settings schemas
class SettingResponse(BaseModel):
    """Response model for a setting."""
    id: int
    key: str
    value: str
    value_type: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class SettingUpdate(BaseModel):
    """Request model for updating a setting."""
    value: str


# Settings endpoints
@router.get("/settings", response_model=List[SettingResponse])
async def list_settings(db: AsyncSession = Depends(get_db)):
    """List all application settings."""
    query = select(AppSetting).order_by(AppSetting.key)
    result = await db.execute(query)
    settings = result.scalars().all()
    return [SettingResponse.model_validate(s) for s in settings]


@router.get("/settings/{key}", response_model=SettingResponse)
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    """Get a specific setting by key."""
    query = select(AppSetting).where(AppSetting.key == key)
    result = await db.execute(query)
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    return SettingResponse.model_validate(setting)


@router.put("/settings/{key}", response_model=SettingResponse)
async def update_setting(
    key: str,
    update_data: SettingUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a setting value."""
    query = select(AppSetting).where(AppSetting.key == key)
    result = await db.execute(query)
    setting = result.scalar_one_or_none()

    if not setting:
        raise HTTPException(status_code=404, detail=f"Setting '{key}' not found")

    # Validate boolean values
    if setting.value_type == SettingValueType.BOOLEAN.value:
        if update_data.value.lower() not in ('true', 'false', '1', '0', 'yes', 'no'):
            raise HTTPException(
                status_code=400,
                detail="Boolean setting must be 'true' or 'false'"
            )
        # Normalize to 'true' or 'false'
        update_data.value = 'true' if update_data.value.lower() in ('true', '1', 'yes') else 'false'

    # Validate integer values
    if setting.value_type == SettingValueType.INTEGER.value:
        try:
            int(update_data.value)
        except ValueError:
            raise HTTPException(status_code=400, detail="Integer setting must be a valid number")

    setting.value = update_data.value
    await db.flush()
    await db.refresh(setting)

    return SettingResponse.model_validate(setting)
