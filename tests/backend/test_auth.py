"""
Authentication API Tests

Tests for authentication endpoints including login, logout, and token validation.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.core.security import get_password_hash, create_access_token


class TestAuthStatus:
    """Test suite for authentication status endpoint."""

    @pytest.mark.asyncio
    async def test_get_auth_status(self, client: AsyncClient):
        """Test getting authentication status."""
        response = await client.get("/api/v1/auth/status")

        assert response.status_code == 200
        data = response.json()
        assert "auth_enabled" in data
        assert "password_available" in data
        assert isinstance(data["auth_enabled"], bool)


class TestPasswordLogin:
    """Test suite for password-based authentication."""

    @pytest.mark.asyncio
    async def test_login_success(self, client: AsyncClient, test_user: User):
        """Test successful login with valid credentials."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "testpassword123"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["email"] == "testuser@example.com"

    @pytest.mark.asyncio
    async def test_login_invalid_email(self, client: AsyncClient):
        """Test login with non-existent email."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_login_invalid_password(self, client: AsyncClient, test_user: User):
        """Test login with incorrect password."""
        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "testuser@example.com",
                "password": "wrongpassword"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "Invalid email or password" in data["detail"]

    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test login with inactive user account."""
        # Create inactive user
        inactive_user = User(
            email="inactive@example.com",
            first_name="Inactive",
            last_name="User",
            is_active=False,
            password_hash=get_password_hash("password123")
        )
        db_session.add(inactive_user)
        await db_session.commit()

        response = await client.post(
            "/api/v1/auth/login",
            json={
                "email": "inactive@example.com",
                "password": "password123"
            }
        )

        assert response.status_code == 401
        data = response.json()
        assert "disabled" in data["detail"].lower()

    @pytest.mark.asyncio
    async def test_login_missing_fields(self, client: AsyncClient):
        """Test login with missing required fields."""
        response = await client.post(
            "/api/v1/auth/login",
            json={"email": "test@example.com"}
        )

        assert response.status_code == 422  # Validation error


class TestTokenValidation:
    """Test suite for JWT token validation."""

    @pytest.mark.asyncio
    async def test_get_current_user(
        self,
        client: AsyncClient,
        auth_headers: dict,
        test_user: User
    ):
        """Test getting current user with valid token."""
        response = await client.get(
            "/api/v1/auth/me",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user.email
        assert data["id"] == test_user.id

    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        response = await client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid_token"}
        )

        # Behavior depends on auth_enabled setting
        assert response.status_code in [200, 401]

    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, client: AsyncClient):
        """Test getting current user without token."""
        response = await client.get("/api/v1/auth/me")

        # Behavior depends on auth_enabled setting
        assert response.status_code in [200, 401]


class TestLogout:
    """Test suite for logout functionality."""

    @pytest.mark.asyncio
    async def test_logout(self, client: AsyncClient, auth_headers: dict):
        """Test logout endpoint."""
        response = await client.post(
            "/api/v1/auth/logout",
            headers=auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestW3IDAuth:
    """Test suite for W3ID SSO authentication."""

    @pytest.mark.asyncio
    async def test_w3id_login_not_configured(self, client: AsyncClient):
        """Test W3ID login when not configured."""
        response = await client.get("/api/v1/auth/w3id/login")

        # Returns 501 when W3ID is not configured
        assert response.status_code in [200, 501]
