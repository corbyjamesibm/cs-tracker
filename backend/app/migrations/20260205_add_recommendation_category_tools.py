"""
Migration: Add category and tools fields to roadmap_recommendations table

This migration adds:
- category (VARCHAR 100): Category like Process, Technology, People
- tools (JSONB): Array of tool names like ["Targetprocess", "Costing"]
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Add category and tools columns to roadmap_recommendations table."""
    async with engine.begin() as conn:
        # Check if columns already exist
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roadmap_recommendations'
            AND column_name IN ('category', 'tools')
        """))
        existing_columns = [row[0] for row in result.fetchall()]

        # Add category column if it doesn't exist
        if 'category' not in existing_columns:
            await conn.execute(text("""
                ALTER TABLE roadmap_recommendations
                ADD COLUMN category VARCHAR(100) NULL
            """))
            print("Added 'category' column to roadmap_recommendations")
        else:
            print("Column 'category' already exists")

        # Add tools column if it doesn't exist
        if 'tools' not in existing_columns:
            await conn.execute(text("""
                ALTER TABLE roadmap_recommendations
                ADD COLUMN tools JSONB NULL
            """))
            print("Added 'tools' column to roadmap_recommendations")
        else:
            print("Column 'tools' already exists")

        print("Migration completed successfully!")


async def rollback_migration():
    """Remove category and tools columns from roadmap_recommendations table."""
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE roadmap_recommendations
            DROP COLUMN IF EXISTS category,
            DROP COLUMN IF EXISTS tools
        """))
        print("Rollback completed - removed category and tools columns")


if __name__ == "__main__":
    asyncio.run(run_migration())
