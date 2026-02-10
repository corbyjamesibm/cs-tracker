"""
Migration: Add assessment builder support

1. Add 'status' column to assessment_templates (draft/active/archived)
2. Backfill status from is_active
3. Create template_change_audit table for tracking all template edits
"""
import asyncio
from sqlalchemy import text
from app.core.database import async_session


async def run_migration():
    """Add status column and create audit table."""
    async with async_session() as db:
        try:
            # 1. Add status column to assessment_templates
            await db.execute(text("""
                ALTER TABLE assessment_templates
                ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active'
            """))

            # 2. Backfill status from is_active
            await db.execute(text("""
                UPDATE assessment_templates
                SET status = CASE
                    WHEN is_active = true THEN 'active'
                    ELSE 'archived'
                END
                WHERE status IS NULL OR status = 'active'
            """))

            # 3. Create template_change_audit table
            await db.execute(text("""
                CREATE TABLE IF NOT EXISTS template_change_audit (
                    id SERIAL PRIMARY KEY,
                    template_id INTEGER NOT NULL REFERENCES assessment_templates(id) ON DELETE CASCADE,
                    entity_type VARCHAR(50) NOT NULL,
                    entity_id INTEGER NOT NULL,
                    field_name VARCHAR(100) NOT NULL,
                    old_value TEXT,
                    new_value TEXT,
                    changed_by_id INTEGER REFERENCES users(id),
                    changed_at TIMESTAMPTZ DEFAULT NOW()
                )
            """))

            # 4. Create indexes
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_template_change_audit_template_id
                ON template_change_audit(template_id)
            """))
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_template_change_audit_changed_at
                ON template_change_audit(changed_at)
            """))
            await db.execute(text("""
                CREATE INDEX IF NOT EXISTS idx_assessment_templates_status
                ON assessment_templates(status)
            """))

            await db.commit()
            print("Migration completed: assessment builder support added")

            # Show results
            result = await db.execute(text("""
                SELECT status, COUNT(*) as count
                FROM assessment_templates
                GROUP BY status
                ORDER BY status
            """))
            rows = result.fetchall()
            print("\nTemplates by status:")
            for row in rows:
                print(f"  {row[0]}: {row[1]}")

        except Exception as e:
            await db.rollback()
            print(f"Migration failed: {e}")
            raise


async def rollback_migration():
    """Remove status column and audit table."""
    async with async_session() as db:
        try:
            await db.execute(text("DROP TABLE IF EXISTS template_change_audit"))
            await db.execute(text("DROP INDEX IF EXISTS idx_assessment_templates_status"))
            await db.execute(text("""
                ALTER TABLE assessment_templates DROP COLUMN IF EXISTS status
            """))
            await db.commit()
            print("Rollback completed: assessment builder support removed")
        except Exception as e:
            await db.rollback()
            print(f"Rollback failed: {e}")
            raise


if __name__ == "__main__":
    asyncio.run(run_migration())
