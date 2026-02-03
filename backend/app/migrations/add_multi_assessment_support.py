"""
Migration script for multi-assessment support (SPM, TBM, FinOps).

This migration:
1. Creates the assessment_types table with seed data
2. Adds assessment_type_id to existing tables (nullable first)
3. Creates customer_assessment_summaries table
4. Creates aggregated_recommendations table
5. Backfills existing SPM templates/assessments with the SPM type

Run this script after updating to the new model versions:
    python -m app.migrations.add_multi_assessment_support
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine, async_session
from app.models.assessment_type import AssessmentType, ASSESSMENT_TYPE_SEED_DATA


async def run_migration():
    """Run the multi-assessment support migration."""
    print("Starting multi-assessment support migration...")

    async with engine.begin() as conn:
        # Step 1: Create assessment_types table if not exists
        print("Step 1: Creating assessment_types table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS assessment_types (
                id SERIAL PRIMARY KEY,
                code VARCHAR(20) NOT NULL UNIQUE,
                name VARCHAR(100) NOT NULL,
                short_name VARCHAR(20) NOT NULL,
                description VARCHAR(500),
                color VARCHAR(20) NOT NULL,
                display_order INTEGER NOT NULL DEFAULT 0,
                is_active BOOLEAN NOT NULL DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_assessment_types_code ON assessment_types(code);"))

        # Step 2: Add assessment_type_id to assessment_templates
        print("Step 2: Adding assessment_type_id to assessment_templates...")
        try:
            await conn.execute(text("""
                ALTER TABLE assessment_templates
                ADD COLUMN IF NOT EXISTS assessment_type_id INTEGER
                REFERENCES assessment_types(id);
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_assessment_templates_assessment_type_id
                ON assessment_templates(assessment_type_id);
            """))
        except Exception as e:
            print(f"  Note: Column may already exist - {e}")

        # Step 3: Add assessment_type_id to customer_assessments
        print("Step 3: Adding assessment_type_id to customer_assessments...")
        try:
            await conn.execute(text("""
                ALTER TABLE customer_assessments
                ADD COLUMN IF NOT EXISTS assessment_type_id INTEGER
                REFERENCES assessment_types(id);
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_customer_assessments_assessment_type_id
                ON customer_assessments(assessment_type_id);
            """))
        except Exception as e:
            print(f"  Note: Column may already exist - {e}")

        # Step 4: Add assessment_type_id to dimension_use_case_mappings
        print("Step 4: Adding assessment_type_id to dimension_use_case_mappings...")
        try:
            await conn.execute(text("""
                ALTER TABLE dimension_use_case_mappings
                ADD COLUMN IF NOT EXISTS assessment_type_id INTEGER
                REFERENCES assessment_types(id);
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_dimension_use_case_mappings_assessment_type_id
                ON dimension_use_case_mappings(assessment_type_id);
            """))
        except Exception as e:
            print(f"  Note: Column may already exist - {e}")

        # Step 5: Add assessment_type_id and other missing columns to roadmap_recommendations
        print("Step 5: Adding columns to roadmap_recommendations...")
        try:
            await conn.execute(text("""
                ALTER TABLE roadmap_recommendations
                ADD COLUMN IF NOT EXISTS assessment_type_id INTEGER
                REFERENCES assessment_types(id);
            """))
            await conn.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_roadmap_recommendations_assessment_type_id
                ON roadmap_recommendations(assessment_type_id);
            """))
            # Add other columns that may be missing from the original schema
            await conn.execute(text("""
                ALTER TABLE roadmap_recommendations
                ADD COLUMN IF NOT EXISTS quality_rating INTEGER,
                ADD COLUMN IF NOT EXISTS rated_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS rated_by_id INTEGER REFERENCES users(id),
                ADD COLUMN IF NOT EXISTS dismissed_at TIMESTAMP WITH TIME ZONE,
                ADD COLUMN IF NOT EXISTS dismissed_by_id INTEGER REFERENCES users(id),
                ADD COLUMN IF NOT EXISTS dismiss_reason VARCHAR(50);
            """))
        except Exception as e:
            print(f"  Note: Columns may already exist - {e}")

        # Step 6: Create customer_assessment_summaries table
        print("Step 6: Creating customer_assessment_summaries table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS customer_assessment_summaries (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL UNIQUE REFERENCES customers(id),
                latest_spm_assessment_id INTEGER REFERENCES customer_assessments(id),
                latest_tbm_assessment_id INTEGER REFERENCES customer_assessments(id),
                latest_finops_assessment_id INTEGER REFERENCES customer_assessments(id),
                scores_by_type JSONB DEFAULT '{}',
                overall_maturity_score FLOAT,
                last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_customer_assessment_summaries_customer_id
            ON customer_assessment_summaries(customer_id);
        """))

        # Step 7: Create aggregated_recommendations table
        print("Step 7: Creating aggregated_recommendations table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS aggregated_recommendations (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                use_case_id INTEGER NOT NULL REFERENCES use_cases(id),
                title VARCHAR(500) NOT NULL,
                description TEXT,
                source_assessment_types JSONB DEFAULT '[]',
                source_recommendation_ids JSONB DEFAULT '[]',
                combined_priority_score FLOAT NOT NULL DEFAULT 0.0,
                base_priority_score FLOAT NOT NULL DEFAULT 0.0,
                is_synergistic BOOLEAN NOT NULL DEFAULT FALSE,
                estimated_effort VARCHAR(10),
                target_quarter VARCHAR(10),
                target_year INTEGER,
                is_accepted BOOLEAN NOT NULL DEFAULT FALSE,
                is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
                accepted_at TIMESTAMP WITH TIME ZONE,
                dismissed_at TIMESTAMP WITH TIME ZONE,
                roadmap_item_id INTEGER REFERENCES roadmap_items(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_aggregated_recommendations_customer_id
            ON aggregated_recommendations(customer_id);
        """))
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS ix_aggregated_recommendations_use_case_id
            ON aggregated_recommendations(use_case_id);
        """))

    # Step 8: Seed assessment types
    print("Step 8: Seeding assessment types...")
    async with async_session() as session:
        # Check if types already exist
        result = await session.execute(text("SELECT COUNT(*) FROM assessment_types"))
        count = result.scalar()

        if count == 0:
            for type_data in ASSESSMENT_TYPE_SEED_DATA:
                atype = AssessmentType(**type_data)
                session.add(atype)
            await session.commit()
            print(f"  Created {len(ASSESSMENT_TYPE_SEED_DATA)} assessment types")
        else:
            print(f"  Assessment types already exist ({count} found), skipping seed")

        # Step 9: Backfill existing data with SPM type
        print("Step 9: Backfilling existing data with SPM type...")

        # Get SPM type ID
        result = await session.execute(
            text("SELECT id FROM assessment_types WHERE code = 'spm'")
        )
        spm_type_id = result.scalar()

        if spm_type_id:
            # Update templates without a type to be SPM
            result = await session.execute(text(f"""
                UPDATE assessment_templates
                SET assessment_type_id = {spm_type_id}
                WHERE assessment_type_id IS NULL
            """))
            print(f"  Updated {result.rowcount} templates to SPM type")

            # Update assessments without a type to be SPM
            result = await session.execute(text(f"""
                UPDATE customer_assessments
                SET assessment_type_id = {spm_type_id}
                WHERE assessment_type_id IS NULL
            """))
            print(f"  Updated {result.rowcount} assessments to SPM type")

            # Update dimension_use_case_mappings without a type to be SPM
            result = await session.execute(text(f"""
                UPDATE dimension_use_case_mappings
                SET assessment_type_id = {spm_type_id}
                WHERE assessment_type_id IS NULL
            """))
            print(f"  Updated {result.rowcount} dimension-use case mappings to SPM type")

            # Update roadmap_recommendations without a type to be SPM
            result = await session.execute(text(f"""
                UPDATE roadmap_recommendations
                SET assessment_type_id = {spm_type_id}
                WHERE assessment_type_id IS NULL
            """))
            print(f"  Updated {result.rowcount} roadmap recommendations to SPM type")

            await session.commit()

    print("Migration completed successfully!")


async def rollback_migration():
    """Rollback the multi-assessment support migration."""
    print("Rolling back multi-assessment support migration...")

    async with engine.begin() as conn:
        # Drop aggregated_recommendations table
        await conn.execute(text("DROP TABLE IF EXISTS aggregated_recommendations CASCADE;"))
        print("  Dropped aggregated_recommendations table")

        # Drop customer_assessment_summaries table
        await conn.execute(text("DROP TABLE IF EXISTS customer_assessment_summaries CASCADE;"))
        print("  Dropped customer_assessment_summaries table")

        # Remove assessment_type_id columns
        await conn.execute(text("""
            ALTER TABLE roadmap_recommendations
            DROP COLUMN IF EXISTS assessment_type_id;
        """))
        print("  Removed assessment_type_id from roadmap_recommendations")

        await conn.execute(text("""
            ALTER TABLE dimension_use_case_mappings
            DROP COLUMN IF EXISTS assessment_type_id;
        """))
        print("  Removed assessment_type_id from dimension_use_case_mappings")

        await conn.execute(text("""
            ALTER TABLE customer_assessments
            DROP COLUMN IF EXISTS assessment_type_id;
        """))
        print("  Removed assessment_type_id from customer_assessments")

        await conn.execute(text("""
            ALTER TABLE assessment_templates
            DROP COLUMN IF EXISTS assessment_type_id;
        """))
        print("  Removed assessment_type_id from assessment_templates")

        # Drop assessment_types table
        await conn.execute(text("DROP TABLE IF EXISTS assessment_types CASCADE;"))
        print("  Dropped assessment_types table")

    print("Rollback completed!")


if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
