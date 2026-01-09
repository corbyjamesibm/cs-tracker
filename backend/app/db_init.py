"""
Database initialization and seed data script.
Run this to create all tables and populate with sample data.
"""
import asyncio
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import text

from app.core.database import engine, Base, async_session
from app.models.user import User, UserRole
from app.models.customer import Customer, Contact, HealthStatus, AdoptionStage
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.engagement import Engagement, EngagementType
from app.models.partner import Partner, PartnerUser
from app.models.use_case import UseCase, CustomerUseCase
from app.models.roadmap import Roadmap, RoadmapItem, RoadmapItemCategory, RoadmapItemStatus


async def init_db():
    """Create all database tables."""
    async with engine.begin() as conn:
        # Enable pgvector extension
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully!")


async def seed_data():
    """Populate database with sample data."""
    async with async_session() as session:
        # Check if data already exists
        result = await session.execute(text("SELECT COUNT(*) FROM users"))
        count = result.scalar()
        if count > 0:
            print("Database already has data, skipping seed.")
            return

        # Create Users
        users = [
            User(
                email="sarah.johnson@company.com",
                first_name="Sarah",
                last_name="Johnson",
                role=UserRole.CSM,
                is_active=True
            ),
            User(
                email="mike.chen@company.com",
                first_name="Mike",
                last_name="Chen",
                role=UserRole.CSM,
                is_active=True
            ),
            User(
                email="admin@company.com",
                first_name="Admin",
                last_name="User",
                role=UserRole.ADMIN,
                is_active=True
            ),
        ]
        session.add_all(users)
        await session.flush()

        # Create Partners first (needed for customer foreign key)
        partners = [
            Partner(
                name="Implementation Partners Inc",
                code="impl_partners",
                is_active=True
            ),
            Partner(
                name="Tech Consulting Group",
                code="tech_consulting",
                is_active=True
            ),
        ]
        session.add_all(partners)
        await session.flush()

        # Create Customers
        customers = [
            Customer(
                name="Acme Corporation",
                industry="Technology",
                health_status=HealthStatus.GREEN,
                health_score=85,
                adoption_stage=AdoptionStage.EXPANSION,
                arr=Decimal("450000.00"),
                contract_start_date=date(2024, 1, 15),
                contract_end_date=date(2026, 1, 14),
                renewal_date=date(2026, 1, 14),
                csm_owner_id=users[0].id,
                website="https://acme.example.com",
                employee_count="500-1000"
            ),
            Customer(
                name="TechStart Inc",
                industry="SaaS",
                health_status=HealthStatus.RED,
                health_score=45,
                adoption_stage=AdoptionStage.ONBOARDING,
                arr=Decimal("85000.00"),
                contract_start_date=date(2025, 10, 1),
                contract_end_date=date(2026, 9, 30),
                renewal_date=date(2026, 9, 30),
                csm_owner_id=users[0].id,
                website="https://techstart.example.com",
                employee_count="50-100"
            ),
            Customer(
                name="Global Finance Ltd",
                industry="Financial Services",
                health_status=HealthStatus.GREEN,
                health_score=92,
                adoption_stage=AdoptionStage.OPTIMIZATION,
                arr=Decimal("780000.00"),
                contract_start_date=date(2023, 6, 1),
                contract_end_date=date(2026, 5, 31),
                renewal_date=date(2026, 5, 31),
                csm_owner_id=users[1].id,
                website="https://globalfinance.example.com",
                employee_count="1000-5000"
            ),
            Customer(
                name="RetailMax",
                industry="Retail",
                health_status=HealthStatus.YELLOW,
                health_score=62,
                adoption_stage=AdoptionStage.ADOPTION,
                arr=Decimal("125000.00"),
                contract_start_date=date(2025, 3, 1),
                contract_end_date=date(2026, 2, 28),
                renewal_date=date(2026, 2, 28),
                csm_owner_id=users[1].id,
                employee_count="200-500"
            ),
            Customer(
                name="HealthCare Plus",
                industry="Healthcare",
                health_status=HealthStatus.GREEN,
                health_score=78,
                adoption_stage=AdoptionStage.ADOPTION,
                arr=Decimal("320000.00"),
                contract_start_date=date(2025, 1, 1),
                contract_end_date=date(2027, 12, 31),
                renewal_date=date(2027, 12, 31),
                csm_owner_id=users[0].id,
                employee_count="1000-5000"
            ),
        ]
        session.add_all(customers)
        await session.flush()

        # Create Contacts
        contacts = [
            Contact(
                customer_id=customers[0].id,
                first_name="John",
                last_name="Smith",
                email="john.smith@acme.example.com",
                phone="+1-555-0101",
                role="VP of Engineering",
                is_primary=True
            ),
            Contact(
                customer_id=customers[0].id,
                first_name="Emily",
                last_name="Davis",
                email="emily.davis@acme.example.com",
                role="Product Manager",
                is_primary=False
            ),
            Contact(
                customer_id=customers[1].id,
                first_name="Alex",
                last_name="Wong",
                email="alex.wong@techstart.example.com",
                role="CTO",
                is_primary=True
            ),
            Contact(
                customer_id=customers[2].id,
                first_name="Maria",
                last_name="Garcia",
                email="maria.garcia@globalfinance.example.com",
                role="Director of Operations",
                is_primary=True
            ),
            Contact(
                customer_id=customers[3].id,
                first_name="David",
                last_name="Lee",
                email="david.lee@retailmax.example.com",
                role="IT Director",
                is_primary=True
            ),
            Contact(
                customer_id=customers[4].id,
                first_name="Susan",
                last_name="Taylor",
                email="susan.taylor@healthcareplus.example.com",
                role="Chief Information Officer",
                is_primary=True
            ),
        ]
        session.add_all(contacts)

        # Create Tasks
        now = datetime.now()
        tasks = [
            Task(
                title="QBR Preparation - Acme Corp",
                description="Prepare quarterly business review presentation and metrics",
                customer_id=customers[0].id,
                assignee_id=users[0].id,
                created_by_id=users[0].id,
                priority=TaskPriority.HIGH,
                status=TaskStatus.IN_PROGRESS,
                due_date=now + timedelta(days=5)
            ),
            Task(
                title="Onboarding check-in call",
                description="Week 4 onboarding check-in with TechStart team",
                customer_id=customers[1].id,
                assignee_id=users[0].id,
                created_by_id=users[0].id,
                priority=TaskPriority.HIGH,
                status=TaskStatus.OPEN,
                due_date=now + timedelta(days=2)
            ),
            Task(
                title="Renewal discussion",
                description="Discuss renewal terms and expansion opportunities",
                customer_id=customers[2].id,
                assignee_id=users[1].id,
                created_by_id=users[1].id,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.OPEN,
                due_date=now + timedelta(days=14)
            ),
            Task(
                title="Health score review",
                description="Analyze declining metrics and create action plan",
                customer_id=customers[3].id,
                assignee_id=users[1].id,
                created_by_id=users[1].id,
                priority=TaskPriority.HIGH,
                status=TaskStatus.OPEN,
                due_date=now + timedelta(days=1)
            ),
            Task(
                title="Executive sponsor meeting",
                description="Annual executive alignment meeting",
                customer_id=customers[4].id,
                assignee_id=users[0].id,
                created_by_id=users[0].id,
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.OPEN,
                due_date=now + timedelta(days=21)
            ),
            Task(
                title="Training session follow-up",
                description="Send training materials and schedule next session",
                customer_id=customers[0].id,
                assignee_id=users[0].id,
                created_by_id=users[0].id,
                priority=TaskPriority.LOW,
                status=TaskStatus.COMPLETED,
                due_date=now - timedelta(days=3),
                completed_at=now - timedelta(days=2)
            ),
        ]
        session.add_all(tasks)

        # Create Engagements
        engagements = [
            Engagement(
                customer_id=customers[0].id,
                created_by_id=users[0].id,
                engagement_type=EngagementType.MEETING,
                title="QBR Meeting",
                summary="Quarterly business review with VP of Engineering. Reviewed metrics and roadmap for Q1.",
                engagement_date=now - timedelta(days=20)
            ),
            Engagement(
                customer_id=customers[0].id,
                created_by_id=users[0].id,
                engagement_type=EngagementType.EMAIL,
                title="Feature request follow-up",
                summary="Sent follow-up on API enhancement request",
                engagement_date=now - timedelta(days=5)
            ),
            Engagement(
                customer_id=customers[1].id,
                created_by_id=users[0].id,
                engagement_type=EngagementType.CALL,
                title="Onboarding Week 2 Call",
                summary="Discussed initial setup challenges. Customer needs more technical support.",
                engagement_date=now - timedelta(days=14)
            ),
            Engagement(
                customer_id=customers[2].id,
                created_by_id=users[1].id,
                engagement_type=EngagementType.MEETING,
                title="Success Planning Session",
                summary="Defined success metrics and goals for next quarter",
                engagement_date=now - timedelta(days=7)
            ),
        ]
        session.add_all(engagements)

        # Create Use Cases
        use_cases = [
            UseCase(
                name="API Integration",
                description="Connect to external systems via REST API",
                category="Integration"
            ),
            UseCase(
                name="Real-time Analytics",
                description="Dashboard with real-time metrics and KPIs",
                category="Analytics"
            ),
            UseCase(
                name="Automated Workflows",
                description="Set up automated business process workflows",
                category="Automation"
            ),
            UseCase(
                name="Data Export",
                description="Export data to external systems and reports",
                category="Integration"
            ),
            UseCase(
                name="User Management",
                description="Manage users, roles, and permissions",
                category="Administration"
            ),
        ]
        session.add_all(use_cases)
        await session.flush()

        # Create Customer Use Cases
        from app.models.use_case import UseCaseStatus
        customer_use_cases = [
            CustomerUseCase(customer_id=customers[0].id, use_case_id=use_cases[0].id, status=UseCaseStatus.OPTIMIZED),
            CustomerUseCase(customer_id=customers[0].id, use_case_id=use_cases[1].id, status=UseCaseStatus.IMPLEMENTED),
            CustomerUseCase(customer_id=customers[0].id, use_case_id=use_cases[2].id, status=UseCaseStatus.IN_PROGRESS),
            CustomerUseCase(customer_id=customers[1].id, use_case_id=use_cases[0].id, status=UseCaseStatus.IN_PROGRESS),
            CustomerUseCase(customer_id=customers[2].id, use_case_id=use_cases[0].id, status=UseCaseStatus.OPTIMIZED),
            CustomerUseCase(customer_id=customers[2].id, use_case_id=use_cases[1].id, status=UseCaseStatus.OPTIMIZED),
            CustomerUseCase(customer_id=customers[2].id, use_case_id=use_cases[2].id, status=UseCaseStatus.IMPLEMENTED),
            CustomerUseCase(customer_id=customers[2].id, use_case_id=use_cases[3].id, status=UseCaseStatus.IMPLEMENTED),
        ]
        session.add_all(customer_use_cases)

        # Create Roadmaps
        roadmaps = [
            Roadmap(
                customer_id=customers[0].id,
                name="Product Roadmap 2026-2027",
                description="Two-year product development roadmap for Acme Corporation",
                start_date=date(2026, 1, 1),
                end_date=date(2027, 12, 31),
                is_active=True,
                created_by_id=users[0].id
            ),
        ]
        session.add_all(roadmaps)
        await session.flush()

        # Create Roadmap Items
        roadmap_items = [
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="Executive Dashboard",
                description="New executive-level dashboard with key business metrics",
                category=RoadmapItemCategory.FEATURE,
                status=RoadmapItemStatus.IN_PROGRESS,
                target_quarter="Q1 2026",
                target_year=2026,
                progress_percent=65,
                display_order=1
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="Advanced Analytics Suite",
                description="Enhanced analytics with predictive capabilities",
                category=RoadmapItemCategory.FEATURE,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q2 2026",
                target_year=2026,
                progress_percent=0,
                display_order=2
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="AI-Powered Insights",
                description="Machine learning-based recommendations and insights",
                category=RoadmapItemCategory.FEATURE,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q4 2026",
                target_year=2026,
                progress_percent=0,
                display_order=3
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="ServiceNow Integration",
                description="Native integration with ServiceNow platform",
                category=RoadmapItemCategory.INTEGRATION,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q1 2026",
                target_year=2026,
                progress_percent=0,
                display_order=1
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="SAP Connector",
                description="Data connector for SAP systems",
                category=RoadmapItemCategory.INTEGRATION,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q3 2026",
                target_year=2026,
                progress_percent=0,
                display_order=2
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="Performance Tuning",
                description="Platform performance optimization initiative",
                category=RoadmapItemCategory.OPTIMIZATION,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q2 2026",
                target_year=2026,
                progress_percent=0,
                display_order=1
            ),
            RoadmapItem(
                roadmap_id=roadmaps[0].id,
                title="Cloud Migration Phase 2",
                description="Second phase of cloud infrastructure migration",
                category=RoadmapItemCategory.MIGRATION,
                status=RoadmapItemStatus.PLANNED,
                target_quarter="Q2 2027",
                target_year=2027,
                progress_percent=0,
                display_order=1
            ),
        ]
        session.add_all(roadmap_items)

        await session.commit()
        print("Seed data created successfully!")
        print(f"  - {len(users)} users")
        print(f"  - {len(customers)} customers")
        print(f"  - {len(contacts)} contacts")
        print(f"  - {len(tasks)} tasks")
        print(f"  - {len(engagements)} engagements")
        print(f"  - {len(use_cases)} use cases")
        print(f"  - {len(roadmaps)} roadmaps")
        print(f"  - {len(roadmap_items)} roadmap items")


async def main():
    """Main function to initialize database and seed data."""
    print("Initializing database...")
    await init_db()
    print("Seeding data...")
    await seed_data()
    print("Done!")


if __name__ == "__main__":
    asyncio.run(main())
