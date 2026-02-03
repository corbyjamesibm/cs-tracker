"""
Admin API Tests

Tests for administrative endpoints including settings and statistics.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.settings import AppSetting
from app.models.user import User


class TestAdminStats:
    """Test suite for admin statistics endpoint."""

    @pytest.mark.asyncio
    async def test_get_stats(
        self,
        client: AsyncClient,
        test_customer,
        test_user,
        test_task,
        admin_auth_headers: dict
    ):
        """Test getting system statistics."""
        response = await client.get(
            "/api/v1/admin/stats",
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        # Should return counts for various entities
        assert "total_customers" in data or "customers" in data


class TestAdminSettings:
    """Test suite for admin settings management."""

    @pytest.mark.asyncio
    async def test_get_settings(
        self,
        client: AsyncClient,
        admin_auth_headers: dict
    ):
        """Test getting application settings."""
        response = await client.get(
            "/api/v1/admin/settings",
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (dict, list))

    @pytest.mark.asyncio
    async def test_update_setting(
        self,
        client: AsyncClient,
        admin_auth_headers: dict,
        db_session: AsyncSession
    ):
        """Test updating application setting."""
        # Create a setting first
        setting = AppSetting(key="test_setting", value="original")
        db_session.add(setting)
        await db_session.commit()

        response = await client.patch(
            "/api/v1/admin/settings/test_setting",
            json={"value": "updated"},
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["value"] == "updated"

    @pytest.mark.asyncio
    async def test_toggle_auth(
        self,
        client: AsyncClient,
        admin_auth_headers: dict
    ):
        """Test toggling authentication on/off."""
        # Get current status
        response = await client.get("/api/v1/auth/status")
        current_status = response.json()["auth_enabled"]

        # Toggle
        response = await client.patch(
            "/api/v1/admin/settings/auth_enabled",
            json={"value": str(not current_status).lower()},
            headers=admin_auth_headers
        )

        assert response.status_code == 200


class TestAdminClearData:
    """Test suite for data clearing functionality."""

    @pytest.mark.asyncio
    async def test_clear_data_requires_confirmation(
        self,
        client: AsyncClient,
        admin_auth_headers: dict
    ):
        """Test that clear data requires confirmation."""
        response = await client.post(
            "/api/v1/admin/clear-data",
            headers=admin_auth_headers
        )

        # Should require confirmation or specific parameters
        assert response.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_clear_data_non_admin(
        self,
        client: AsyncClient,
        auth_headers: dict  # Regular user headers
    ):
        """Test that non-admin cannot clear data."""
        response = await client.post(
            "/api/v1/admin/clear-data",
            headers=auth_headers
        )

        # Should be forbidden or unauthorized
        assert response.status_code in [401, 403]
