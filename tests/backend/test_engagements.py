"""
Engagement API Tests

Tests for customer engagement tracking endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, datetime

from app.models.engagement import Engagement, EngagementType
from app.models.customer import Customer
from app.models.user import User


class TestEngagementList:
    """Test suite for engagement listing and filtering."""

    @pytest.mark.asyncio
    async def test_list_engagements_empty(self, client: AsyncClient):
        """Test listing engagements when none exist."""
        response = await client.get("/api/v1/engagements")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_engagements_filter_customer(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test filtering engagements by customer."""
        # Create an engagement
        engagement = Engagement(
            customer_id=test_customer.id,
            engagement_type=EngagementType.MEETING,
            engagement_date=date.today(),
            subject="Test Meeting"
        )
        db_session.add(engagement)
        await db_session.commit()

        response = await client.get(f"/api/v1/engagements?customer_id={test_customer.id}")

        assert response.status_code == 200
        data = response.json()
        for eng in data["items"]:
            assert eng["customer_id"] == test_customer.id

    @pytest.mark.asyncio
    async def test_list_engagements_filter_type(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test filtering engagements by type."""
        # Create engagements of different types
        engagement = Engagement(
            customer_id=test_customer.id,
            engagement_type=EngagementType.QBR,
            engagement_date=date.today(),
            subject="Quarterly Review"
        )
        db_session.add(engagement)
        await db_session.commit()

        response = await client.get("/api/v1/engagements?engagement_type=qbr")

        assert response.status_code == 200
        data = response.json()
        for eng in data["items"]:
            assert eng["engagement_type"] == "qbr"


class TestEngagementCreate:
    """Test suite for engagement creation."""

    @pytest.mark.asyncio
    async def test_create_engagement_minimal(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating engagement with minimal fields."""
        response = await client.post(
            "/api/v1/engagements",
            json={
                "customer_id": test_customer.id,
                "engagement_type": "call",
                "engagement_date": date.today().isoformat(),
                "subject": "Quick call"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["subject"] == "Quick call"
        assert data["engagement_type"] == "call"

    @pytest.mark.asyncio
    async def test_create_engagement_full(
        self,
        client: AsyncClient,
        test_customer: Customer,
        test_user: User
    ):
        """Test creating engagement with all fields."""
        engagement_data = {
            "customer_id": test_customer.id,
            "engagement_type": "meeting",
            "engagement_date": date.today().isoformat(),
            "subject": "Full Meeting",
            "notes": "Detailed notes about the meeting",
            "attendees": ["John Doe", "Jane Smith"],
            "outcome": "Positive discussion",
            "follow_up_actions": "Schedule follow-up next week"
        }

        response = await client.post("/api/v1/engagements", json=engagement_data)

        assert response.status_code == 201
        data = response.json()
        assert data["subject"] == "Full Meeting"
        assert data["notes"] == "Detailed notes about the meeting"

    @pytest.mark.asyncio
    async def test_create_engagement_qbr(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating QBR engagement."""
        response = await client.post(
            "/api/v1/engagements",
            json={
                "customer_id": test_customer.id,
                "engagement_type": "qbr",
                "engagement_date": date.today().isoformat(),
                "subject": "Q1 Business Review"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["engagement_type"] == "qbr"

    @pytest.mark.asyncio
    async def test_create_engagement_invalid_type(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating engagement with invalid type."""
        response = await client.post(
            "/api/v1/engagements",
            json={
                "customer_id": test_customer.id,
                "engagement_type": "invalid_type",
                "engagement_date": date.today().isoformat(),
                "subject": "Test"
            }
        )

        assert response.status_code == 422


class TestEngagementGet:
    """Test suite for getting individual engagements."""

    @pytest.mark.asyncio
    async def test_get_engagement_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test getting existing engagement by ID."""
        engagement = Engagement(
            customer_id=test_customer.id,
            engagement_type=EngagementType.CALL,
            engagement_date=date.today(),
            subject="Test Call"
        )
        db_session.add(engagement)
        await db_session.commit()
        await db_session.refresh(engagement)

        response = await client.get(f"/api/v1/engagements/{engagement.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == engagement.id

    @pytest.mark.asyncio
    async def test_get_engagement_not_found(self, client: AsyncClient):
        """Test getting non-existent engagement."""
        response = await client.get("/api/v1/engagements/99999")

        assert response.status_code == 404


class TestEngagementUpdate:
    """Test suite for engagement updates."""

    @pytest.mark.asyncio
    async def test_update_engagement_notes(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test updating engagement notes."""
        engagement = Engagement(
            customer_id=test_customer.id,
            engagement_type=EngagementType.MEETING,
            engagement_date=date.today(),
            subject="Meeting"
        )
        db_session.add(engagement)
        await db_session.commit()
        await db_session.refresh(engagement)

        response = await client.patch(
            f"/api/v1/engagements/{engagement.id}",
            json={"notes": "Updated meeting notes"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Updated meeting notes"


class TestEngagementDelete:
    """Test suite for engagement deletion."""

    @pytest.mark.asyncio
    async def test_delete_engagement_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test deleting engagement."""
        engagement = Engagement(
            customer_id=test_customer.id,
            engagement_type=EngagementType.EMAIL,
            engagement_date=date.today(),
            subject="To Delete"
        )
        db_session.add(engagement)
        await db_session.commit()
        await db_session.refresh(engagement)

        response = await client.delete(f"/api/v1/engagements/{engagement.id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_engagement_not_found(self, client: AsyncClient):
        """Test deleting non-existent engagement."""
        response = await client.delete("/api/v1/engagements/99999")

        assert response.status_code == 404
