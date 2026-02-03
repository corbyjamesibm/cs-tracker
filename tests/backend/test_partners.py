"""
Partner API Tests

Tests for partner management endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.partner import Partner, PartnerUser


class TestPartnerList:
    """Test suite for partner listing."""

    @pytest.mark.asyncio
    async def test_list_partners_empty(self, client: AsyncClient):
        """Test listing partners when none exist."""
        response = await client.get("/api/v1/partners")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data

    @pytest.mark.asyncio
    async def test_list_partners_with_data(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test listing partners returns existing partners."""
        response = await client.get("/api/v1/partners")

        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_partners_filter_active(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test filtering partners by active status."""
        # Create inactive partner
        inactive_partner = Partner(
            name="Inactive Partner",
            code="INACTIVE",
            is_active=False
        )
        db_session.add(inactive_partner)
        await db_session.commit()

        response = await client.get("/api/v1/partners?is_active=true")

        assert response.status_code == 200
        data = response.json()
        for partner in data["items"]:
            assert partner["is_active"] is True


class TestPartnerCreate:
    """Test suite for partner creation."""

    @pytest.mark.asyncio
    async def test_create_partner_minimal(self, client: AsyncClient):
        """Test creating partner with minimal fields."""
        response = await client.post(
            "/api/v1/partners",
            json={
                "name": "New Partner",
                "code": "NEWPARTNER"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Partner"
        assert data["code"] == "NEWPARTNER"
        assert data["is_active"] is True  # Default

    @pytest.mark.asyncio
    async def test_create_partner_full(self, client: AsyncClient):
        """Test creating partner with all fields."""
        partner_data = {
            "name": "Full Partner Corp",
            "code": "FULLPARTNER",
            "contact_email": "contact@fullpartner.com",
            "contact_phone": "+1-555-0123",
            "website": "https://fullpartner.com",
            "is_active": True
        }

        response = await client.post("/api/v1/partners", json=partner_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Full Partner Corp"
        assert data["contact_email"] == "contact@fullpartner.com"

    @pytest.mark.asyncio
    async def test_create_partner_duplicate_code(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test creating partner with duplicate code."""
        response = await client.post(
            "/api/v1/partners",
            json={
                "name": "Duplicate",
                "code": test_partner.code
            }
        )

        # Should fail with conflict or validation error
        assert response.status_code in [400, 409, 422]


class TestPartnerGet:
    """Test suite for getting individual partners."""

    @pytest.mark.asyncio
    async def test_get_partner_success(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test getting existing partner by ID."""
        response = await client.get(f"/api/v1/partners/{test_partner.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_partner.id
        assert data["name"] == test_partner.name

    @pytest.mark.asyncio
    async def test_get_partner_not_found(self, client: AsyncClient):
        """Test getting non-existent partner."""
        response = await client.get("/api/v1/partners/99999")

        assert response.status_code == 404


class TestPartnerUpdate:
    """Test suite for partner updates."""

    @pytest.mark.asyncio
    async def test_update_partner_name(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test updating partner name."""
        response = await client.patch(
            f"/api/v1/partners/{test_partner.id}",
            json={"name": "Updated Partner Name"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Partner Name"

    @pytest.mark.asyncio
    async def test_update_partner_deactivate(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test deactivating partner."""
        response = await client.patch(
            f"/api/v1/partners/{test_partner.id}",
            json={"is_active": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False


class TestPartnerUsers:
    """Test suite for partner user management."""

    @pytest.mark.asyncio
    async def test_add_partner_user(
        self,
        client: AsyncClient,
        test_partner: Partner
    ):
        """Test adding user to partner."""
        response = await client.post(
            f"/api/v1/partners/{test_partner.id}/users",
            json={
                "email": "partner.user@example.com",
                "first_name": "Partner",
                "last_name": "User"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "partner.user@example.com"

    @pytest.mark.asyncio
    async def test_list_partner_users(
        self,
        client: AsyncClient,
        test_partner: Partner,
        db_session: AsyncSession
    ):
        """Test listing users for partner."""
        # Add a partner user
        partner_user = PartnerUser(
            partner_id=test_partner.id,
            email="existing.user@partner.com",
            first_name="Existing",
            last_name="User"
        )
        db_session.add(partner_user)
        await db_session.commit()

        response = await client.get(f"/api/v1/partners/{test_partner.id}/users")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
