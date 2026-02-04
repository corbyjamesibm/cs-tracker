"""
Migration: Add tools column to customer_recommendations
Date: 2026-02-04
Description: Adds a tools JSONB column for multi-select tool associations
             (Targetprocess, Costing, Planning, Cloudability)
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Add tools column to customer_recommendations table."""
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns
                WHERE table_name = 'customer_recommendations'
                AND column_name = 'tools'
            )
        """))
        if result.scalar():
            print("Column tools already exists, skipping...")
            return

        # Add the tools column
        await conn.execute(text("""
            ALTER TABLE customer_recommendations
            ADD COLUMN tools JSONB DEFAULT '[]'::jsonb
        """))
        print("Added tools column to customer_recommendations")

    print("Migration completed successfully!")


async def rollback_migration():
    """Remove the tools column."""
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE customer_recommendations
            DROP COLUMN IF EXISTS tools
        """))
        print("Dropped tools column from customer_recommendations")

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
