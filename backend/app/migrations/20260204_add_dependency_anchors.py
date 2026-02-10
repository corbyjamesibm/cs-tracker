"""
Migration: Add dependency_anchors column to roadmap_items table
Date: 2026-02-04
Description: Adds a JSON column to store custom anchor points for dependency line routing
"""

import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Add dependency_anchors column to roadmap_items table"""
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'roadmap_items' AND column_name = 'dependency_anchors'
        """))
        if result.fetchone():
            print("Column dependency_anchors already exists, skipping...")
            return

        # Add the column
        await conn.execute(text("""
            ALTER TABLE roadmap_items
            ADD COLUMN dependency_anchors JSON DEFAULT '{}'
        """))
        print("Added dependency_anchors column to roadmap_items table")


async def rollback_migration():
    """Remove dependency_anchors column from roadmap_items table"""
    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE roadmap_items
            DROP COLUMN IF EXISTS dependency_anchors
        """))
        print("Removed dependency_anchors column from roadmap_items table")


if __name__ == "__main__":
    asyncio.run(run_migration())
