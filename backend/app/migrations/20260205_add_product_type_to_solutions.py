"""
Migration: Add product_type to tp_solutions table

This adds a product_type field to distinguish between TargetProcess and Apptio solutions,
allowing the flow visualization to show framework-specific data.

Product types:
- targetprocess: SPM/TargetProcess solutions
- apptio1: TBM/Apptio 1 features
- apptio_cloudability: FinOps/Cloudability features
"""
import asyncio
from sqlalchemy import text
from app.core.database import async_session


async def run_migration():
    """Add product_type column and populate based on existing data."""
    async with async_session() as db:
        try:
            # 1. Add product_type column if it doesn't exist
            await db.execute(text("""
                ALTER TABLE tp_solutions
                ADD COLUMN IF NOT EXISTS product_type VARCHAR(50) DEFAULT 'targetprocess'
            """))

            # 2. Update existing Apptio solutions based on name pattern
            await db.execute(text("""
                UPDATE tp_solutions
                SET product_type = 'apptio1'
                WHERE name ILIKE '%apptio%'
                   OR name ILIKE '%cost transparency%'
                   OR name ILIKE '%it allocation%'
                   OR name ILIKE '%tbm%'
            """))

            # 3. Update FinOps/Cloudability solutions
            await db.execute(text("""
                UPDATE tp_solutions
                SET product_type = 'apptio_cloudability'
                WHERE name ILIKE '%cloudability%'
                   OR name ILIKE '%finops%' AND product_type = 'targetprocess'
            """))

            # 4. Create index for faster filtering
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_tp_solutions_product_type
                ON tp_solutions(product_type)
            """))

            await db.commit()
            print("Migration completed: added product_type to tp_solutions")

            # Show results
            result = await db.execute(text("""
                SELECT product_type, COUNT(*) as count
                FROM tp_solutions
                GROUP BY product_type
                ORDER BY product_type
            """))
            rows = result.fetchall()
            print("\nSolutions by product type:")
            for row in rows:
                print(f"  {row[0]}: {row[1]}")

        except Exception as e:
            await db.rollback()
            print(f"Migration failed: {e}")
            raise


async def rollback_migration():
    """Remove product_type column."""
    async with async_session() as db:
        try:
            await db.execute(text("""
                DROP INDEX IF EXISTS idx_tp_solutions_product_type
            """))
            await db.execute(text("""
                ALTER TABLE tp_solutions DROP COLUMN IF EXISTS product_type
            """))
            await db.commit()
            print("Rollback completed: removed product_type from tp_solutions")
        except Exception as e:
            await db.rollback()
            print(f"Rollback failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(run_migration())
