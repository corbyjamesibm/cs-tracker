"""
Migration: Add customer_recommendations table
Date: 2026-02-04
Description: Creates customer_recommendations table for customer-level recommendations
             that can optionally be tied to assessment types for reporting
"""
import asyncio
from sqlalchemy import text
from app.core.database import engine


async def run_migration():
    """Create customer_recommendations table."""
    async with engine.begin() as conn:
        # Check if table already exists
        result = await conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_name = 'customer_recommendations'
            )
        """))
        if result.scalar():
            print("Table customer_recommendations already exists, skipping...")
            return

        # Create enum type for recommendation status
        await conn.execute(text("""
            DO $$ BEGIN
                CREATE TYPE recommendationstatus AS ENUM ('open', 'in_progress', 'completed', 'dismissed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        """))
        print("Created recommendationstatus enum type")

        # Create the table
        await conn.execute(text("""
            CREATE TABLE customer_recommendations (
                id SERIAL PRIMARY KEY,
                customer_id INTEGER NOT NULL REFERENCES customers(id),
                assessment_type_id INTEGER REFERENCES assessment_types(id),
                title VARCHAR(255) NOT NULL,
                description TEXT,
                priority recommendationpriority DEFAULT 'medium',
                status recommendationstatus DEFAULT 'open',
                category VARCHAR(100),
                expected_impact FLOAT,
                impacted_dimensions JSONB DEFAULT '[]'::jsonb,
                due_date DATE,
                completed_date DATE,
                created_by_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))
        print("Created customer_recommendations table")

        # Create indexes
        await conn.execute(text("""
            CREATE INDEX ix_customer_recommendations_customer_id
            ON customer_recommendations(customer_id)
        """))
        await conn.execute(text("""
            CREATE INDEX ix_customer_recommendations_assessment_type_id
            ON customer_recommendations(assessment_type_id)
        """))
        await conn.execute(text("""
            CREATE INDEX ix_customer_recommendations_status
            ON customer_recommendations(status)
        """))
        print("Created indexes")

    print("Migration completed successfully!")


async def rollback_migration():
    """Remove the customer_recommendations table."""
    async with engine.begin() as conn:
        await conn.execute(text("DROP TABLE IF EXISTS customer_recommendations CASCADE"))
        print("Dropped customer_recommendations table")

        # Don't drop the enum type as it might be used elsewhere

    print("Rollback completed successfully!")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "rollback":
        asyncio.run(rollback_migration())
    else:
        asyncio.run(run_migration())
