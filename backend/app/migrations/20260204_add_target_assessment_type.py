"""
Migration: Add assessment_type_id to customer_assessment_targets
Date: 2026-02-04
Description: Adds assessment_type_id column to make targets framework-specific (SPM, TBM, FinOps)
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Add assessment_type_id column to customer_assessment_targets table."""
    async with engine.begin() as conn:
        # Check if column already exists
        result = await conn.execute(text("""
            SELECT column_name FROM information_schema.columns
            WHERE table_name = 'customer_assessment_targets'
            AND column_name = 'assessment_type_id'
        """))
        if result.fetchone():
            print("Column assessment_type_id already exists, skipping...")
            return

        # Add the column as nullable
        await conn.execute(text("""
            ALTER TABLE customer_assessment_targets
            ADD COLUMN assessment_type_id INTEGER REFERENCES assessment_types(id)
        """))
        print("Added assessment_type_id column")

        # Create index for efficient filtering
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_customer_assessment_targets_assessment_type_id
            ON customer_assessment_targets(assessment_type_id)
        """))
        print("Created index on assessment_type_id")

        # Backfill existing targets with SPM (id=1) as default
        await conn.execute(text("""
            UPDATE customer_assessment_targets
            SET assessment_type_id = 1
            WHERE assessment_type_id IS NULL
        """))
        print("Backfilled existing targets with SPM (assessment_type_id=1)")

    print("Migration completed successfully!")


async def rollback_migration():
    """Remove the assessment_type_id column."""
    async with engine.begin() as conn:
        # Drop index first
        await conn.execute(text("""
            DROP INDEX IF EXISTS ix_customer_assessment_targets_assessment_type_id
        """))
        print("Dropped index")

        # Drop column
        await conn.execute(text("""
            ALTER TABLE customer_assessment_targets
            DROP COLUMN IF EXISTS assessment_type_id
        """))
        print("Dropped assessment_type_id column")

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
