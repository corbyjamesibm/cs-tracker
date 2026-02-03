"""
Backend Test Configuration and Fixtures

This module provides shared fixtures for backend API testing including:
- Async test client setup
- Test database configuration
- Authentication helpers
- Sample data factories
"""

import asyncio
import pytest
import pytest_asyncio
from typing import AsyncGenerator, Generator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

import sys
import os

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

from app.main import app
from app.core.database import get_db, Base
from app.core.security import create_access_token, get_password_hash
from app.models.user import User, UserRole
from app.models.customer import Customer, HealthStatus, AdoptionStage, Contact
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.engagement import Engagement, EngagementType
from app.models.risk import Risk, RiskSeverity, RiskStatus
from app.models.partner import Partner
from app.models.settings import AppSetting


# Test database URL - use SQLite for testing
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def db_session(test_engine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session_maker = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )

    async with async_session_maker() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """Create test HTTP client with overridden database dependency."""

    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


@pytest_asyncio.fixture(scope="function")
async def test_user(db_session: AsyncSession) -> User:
    """Create a test user."""
    user = User(
        email="testuser@example.com",
        first_name="Test",
        last_name="User",
        role=UserRole.CSM,
        is_active=True,
        password_hash=get_password_hash("testpassword123")
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session: AsyncSession) -> User:
    """Create an admin user."""
    user = User(
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        role=UserRole.ADMIN,
        is_active=True,
        password_hash=get_password_hash("adminpassword123")
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user


@pytest_asyncio.fixture(scope="function")
async def auth_headers(test_user: User) -> dict:
    """Create authorization headers for test user."""
    token = create_access_token(data={"sub": str(test_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def admin_auth_headers(admin_user: User) -> dict:
    """Create authorization headers for admin user."""
    token = create_access_token(data={"sub": str(admin_user.id)})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def test_customer(db_session: AsyncSession, test_user: User) -> Customer:
    """Create a test customer."""
    customer = Customer(
        name="Test Customer Inc",
        salesforce_id="SF-12345",
        health_status=HealthStatus.GREEN,
        adoption_stage=AdoptionStage.ADOPTION,
        arr=100000,
        industry="Technology",
        csm_owner_id=test_user.id
    )
    db_session.add(customer)
    await db_session.commit()
    await db_session.refresh(customer)
    return customer


@pytest_asyncio.fixture(scope="function")
async def test_partner(db_session: AsyncSession) -> Partner:
    """Create a test partner."""
    partner = Partner(
        name="Test Partner LLC",
        code="TESTPARTNER",
        contact_email="partner@example.com",
        is_active=True
    )
    db_session.add(partner)
    await db_session.commit()
    await db_session.refresh(partner)
    return partner


@pytest_asyncio.fixture(scope="function")
async def test_task(db_session: AsyncSession, test_customer: Customer, test_user: User) -> Task:
    """Create a test task."""
    task = Task(
        title="Test Task",
        description="Test task description",
        status=TaskStatus.OPEN,
        priority=TaskPriority.MEDIUM,
        customer_id=test_customer.id,
        assignee_id=test_user.id
    )
    db_session.add(task)
    await db_session.commit()
    await db_session.refresh(task)
    return task


@pytest_asyncio.fixture(scope="function")
async def test_risk(db_session: AsyncSession, test_customer: Customer) -> Risk:
    """Create a test risk."""
    risk = Risk(
        title="Test Risk",
        description="Test risk description",
        severity=RiskSeverity.MEDIUM,
        status=RiskStatus.OPEN,
        customer_id=test_customer.id,
        probability_rating=3,
        impact_rating=3
    )
    db_session.add(risk)
    await db_session.commit()
    await db_session.refresh(risk)
    return risk


@pytest_asyncio.fixture(scope="function")
async def disable_auth(db_session: AsyncSession):
    """Disable authentication for testing."""
    setting = AppSetting(key="auth_enabled", value="false")
    db_session.add(setting)
    await db_session.commit()
    yield
    await db_session.delete(setting)
    await db_session.commit()


# Data factories for creating multiple test objects
class TestDataFactory:
    """Factory class for creating test data."""

    @staticmethod
    async def create_customers(db_session: AsyncSession, count: int = 5) -> list[Customer]:
        """Create multiple test customers."""
        customers = []
        health_statuses = [HealthStatus.GREEN, HealthStatus.YELLOW, HealthStatus.RED]
        stages = list(AdoptionStage)

        for i in range(count):
            customer = Customer(
                name=f"Customer {i + 1}",
                salesforce_id=f"SF-{10000 + i}",
                health_status=health_statuses[i % len(health_statuses)],
                adoption_stage=stages[i % len(stages)],
                arr=50000 * (i + 1),
                industry=["Technology", "Finance", "Healthcare", "Retail", "Manufacturing"][i % 5]
            )
            db_session.add(customer)
            customers.append(customer)

        await db_session.commit()
        for c in customers:
            await db_session.refresh(c)
        return customers

    @staticmethod
    async def create_tasks(
        db_session: AsyncSession,
        customer: Customer,
        assignee: User,
        count: int = 3
    ) -> list[Task]:
        """Create multiple test tasks."""
        tasks = []
        statuses = [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED]
        priorities = [TaskPriority.LOW, TaskPriority.MEDIUM, TaskPriority.HIGH]

        for i in range(count):
            task = Task(
                title=f"Task {i + 1}",
                description=f"Description for task {i + 1}",
                status=statuses[i % len(statuses)],
                priority=priorities[i % len(priorities)],
                customer_id=customer.id,
                assignee_id=assignee.id
            )
            db_session.add(task)
            tasks.append(task)

        await db_session.commit()
        for t in tasks:
            await db_session.refresh(t)
        return tasks


@pytest.fixture
def data_factory():
    """Provide access to test data factory."""
    return TestDataFactory()
