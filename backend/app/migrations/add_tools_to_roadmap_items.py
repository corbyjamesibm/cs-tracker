"""
Migration script to add tools column to roadmap_items table.

Run this script after updating to support tools on roadmap items:
    python -m app.migrations.add_tools_to_roadmap_items
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Add tools column to roadmap_items table."""
    print("Adding tools column to roadmap_items table...")

    async with engine.begin() as conn:
        # Add tools column if it doesn't exist
        try:
            await conn.execute(text("""
                ALTER TABLE roadmap_items
                ADD COLUMN IF NOT EXISTS tools JSON DEFAULT '[]';
            """))
            print("  Added tools column to roadmap_items")
        except Exception as e:
            print(f"  Note: Column may already exist - {e}")

    print("Migration completed!")


async def rollback_migration():
    """Remove tools column from roadmap_items table."""
    print("Removing tools column from roadmap_items table...")

    async with engine.begin() as conn:
        await conn.execute(text("""
            ALTER TABLE roadmap_items
            DROP COLUMN IF EXISTS tools;
        """))
        print("  Removed tools column from roadmap_items")

    print("Rollback completed!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
