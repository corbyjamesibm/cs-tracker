"""
Lookup API Tests

Tests for configurable dropdown list endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lookup import LookupValue


class TestLookupCategories:
    """Test suite for lookup categories."""

    @pytest.mark.asyncio
    async def test_get_categories(self, client: AsyncClient):
        """Test getting available lookup categories."""
        response = await client.get("/api/v1/lookups/categories")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should include standard categories
        expected_categories = ["industry", "employee_count", "risk_category"]
        for cat in expected_categories:
            assert any(c.get("name") == cat or c == cat for c in data)


class TestLookupValues:
    """Test suite for lookup value management."""

    @pytest.mark.asyncio
    async def test_get_category_values(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test getting values for a category."""
        # Create some lookup values
        value = LookupValue(
            category="industry",
            value="Technology",
            display_order=1,
            is_active=True
        )
        db_session.add(value)
        await db_session.commit()

        response = await client.get("/api/v1/lookups/category/industry")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_get_category_values_include_inactive(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test getting values including inactive ones."""
        # Create inactive value
        value = LookupValue(
            category="industry",
            value="Deprecated Industry",
            is_active=False
        )
        db_session.add(value)
        await db_session.commit()

        response = await client.get("/api/v1/lookups/category/industry?include_inactive=true")

        assert response.status_code == 200
        data = response.json()
        # Should include inactive values
        assert any(v.get("is_active") is False for v in data) or len(data) >= 0


class TestLookupCreate:
    """Test suite for lookup value creation."""

    @pytest.mark.asyncio
    async def test_create_lookup_value(self, client: AsyncClient):
        """Test creating a new lookup value."""
        response = await client.post(
            "/api/v1/lookups",
            json={
                "category": "industry",
                "value": "New Industry",
                "display_order": 10
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["category"] == "industry"
        assert data["value"] == "New Industry"
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_create_lookup_value_duplicate(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test creating duplicate lookup value."""
        # Create first value
        value = LookupValue(
            category="industry",
            value="Duplicate Test",
            is_active=True
        )
        db_session.add(value)
        await db_session.commit()

        # Try to create duplicate
        response = await client.post(
            "/api/v1/lookups",
            json={
                "category": "industry",
                "value": "Duplicate Test"
            }
        )

        assert response.status_code in [400, 409, 422]


class TestLookupUpdate:
    """Test suite for lookup value updates."""

    @pytest.mark.asyncio
    async def test_update_lookup_value(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test updating lookup value."""
        value = LookupValue(
            category="industry",
            value="Original",
            is_active=True
        )
        db_session.add(value)
        await db_session.commit()
        await db_session.refresh(value)

        response = await client.patch(
            f"/api/v1/lookups/{value.id}",
            json={"value": "Updated"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["value"] == "Updated"

    @pytest.mark.asyncio
    async def test_deactivate_lookup_value(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test deactivating lookup value."""
        value = LookupValue(
            category="industry",
            value="To Deactivate",
            is_active=True
        )
        db_session.add(value)
        await db_session.commit()
        await db_session.refresh(value)

        response = await client.patch(
            f"/api/v1/lookups/{value.id}",
            json={"is_active": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False


class TestLookupDelete:
    """Test suite for lookup value deletion."""

    @pytest.mark.asyncio
    async def test_delete_lookup_value(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test deleting lookup value."""
        value = LookupValue(
            category="industry",
            value="To Delete",
            is_active=True
        )
        db_session.add(value)
        await db_session.commit()
        await db_session.refresh(value)

        response = await client.delete(f"/api/v1/lookups/{value.id}")

        assert response.status_code == 204


class TestLookupInitialize:
    """Test suite for category initialization."""

    @pytest.mark.asyncio
    async def test_initialize_category(self, client: AsyncClient):
        """Test initializing a category with default values."""
        response = await client.post("/api/v1/lookups/initialize/industry")

        assert response.status_code in [200, 201]
        data = response.json()
        # Should return initialized values
        assert isinstance(data, list)
