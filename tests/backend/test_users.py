"""
User API Tests

Tests for user management endpoints including CRUD operations and role management.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole


class TestUserList:
    """Test suite for user listing."""

    @pytest.mark.asyncio
    async def test_list_users(self, client: AsyncClient, test_user: User):
        """Test listing all users."""
        response = await client.get("/api/v1/users")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_users_pagination(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test user list pagination."""
        # Create multiple users
        for i in range(5):
            user = User(
                email=f"user{i}@example.com",
                first_name=f"User{i}",
                last_name="Test",
                role=UserRole.CSM,
                is_active=True
            )
            db_session.add(user)
        await db_session.commit()

        response = await client.get("/api/v1/users?skip=0&limit=3")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 3

    @pytest.mark.asyncio
    async def test_list_users_filter_role(
        self,
        client: AsyncClient,
        admin_user: User,
        test_user: User
    ):
        """Test filtering users by role."""
        response = await client.get("/api/v1/users?role=admin")

        assert response.status_code == 200
        data = response.json()
        for user in data["items"]:
            assert user["role"] == "admin"

    @pytest.mark.asyncio
    async def test_list_users_filter_active(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test filtering users by active status."""
        # Create inactive user
        inactive_user = User(
            email="inactive@test.com",
            first_name="Inactive",
            last_name="User",
            is_active=False
        )
        db_session.add(inactive_user)
        await db_session.commit()

        response = await client.get("/api/v1/users?is_active=true")

        assert response.status_code == 200
        data = response.json()
        for user in data["items"]:
            assert user["is_active"] is True


class TestUserCreate:
    """Test suite for user creation."""

    @pytest.mark.asyncio
    async def test_create_user_minimal(self, client: AsyncClient):
        """Test creating user with minimal fields."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "newuser@example.com",
                "first_name": "New",
                "last_name": "User"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert data["first_name"] == "New"
        assert data["last_name"] == "User"
        assert data["is_active"] is True  # Default
        assert data["role"] == "csm"  # Default

    @pytest.mark.asyncio
    async def test_create_user_with_role(self, client: AsyncClient):
        """Test creating user with specific role."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "manager@example.com",
                "first_name": "Manager",
                "last_name": "User",
                "role": "manager"
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["role"] == "manager"

    @pytest.mark.asyncio
    async def test_create_user_with_password(self, client: AsyncClient):
        """Test creating user with password."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "withpass@example.com",
                "first_name": "Password",
                "last_name": "User",
                "password": "securepassword123"
            }
        )

        assert response.status_code == 201
        data = response.json()
        # Password hash should not be returned
        assert "password_hash" not in data
        assert "password" not in data

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test creating user with duplicate email."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": test_user.email,
                "first_name": "Duplicate",
                "last_name": "User"
            }
        )

        # Should fail with conflict or validation error
        assert response.status_code in [400, 409, 422]

    @pytest.mark.asyncio
    async def test_create_user_invalid_email(self, client: AsyncClient):
        """Test creating user with invalid email format."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "invalid-email",
                "first_name": "Invalid",
                "last_name": "Email"
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_user_invalid_role(self, client: AsyncClient):
        """Test creating user with invalid role."""
        response = await client.post(
            "/api/v1/users",
            json={
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User",
                "role": "superadmin"  # Invalid role
            }
        )

        assert response.status_code == 422


class TestUserGet:
    """Test suite for getting individual users."""

    @pytest.mark.asyncio
    async def test_get_user_success(self, client: AsyncClient, test_user: User):
        """Test getting existing user by ID."""
        response = await client.get(f"/api/v1/users/{test_user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["first_name"] == test_user.first_name

    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client: AsyncClient):
        """Test getting non-existent user."""
        response = await client.get("/api/v1/users/99999")

        assert response.status_code == 404


class TestUserUpdate:
    """Test suite for user updates."""

    @pytest.mark.asyncio
    async def test_update_user_name(self, client: AsyncClient, test_user: User):
        """Test updating user name."""
        response = await client.patch(
            f"/api/v1/users/{test_user.id}",
            json={
                "first_name": "Updated",
                "last_name": "Name"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == "Updated"
        assert data["last_name"] == "Name"

    @pytest.mark.asyncio
    async def test_update_user_role(
        self,
        client: AsyncClient,
        test_user: User,
        admin_auth_headers: dict
    ):
        """Test updating user role (admin only)."""
        response = await client.patch(
            f"/api/v1/users/{test_user.id}",
            json={"role": "manager"},
            headers=admin_auth_headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["role"] == "manager"

    @pytest.mark.asyncio
    async def test_update_user_deactivate(
        self,
        client: AsyncClient,
        test_user: User
    ):
        """Test deactivating user."""
        response = await client.patch(
            f"/api/v1/users/{test_user.id}",
            json={"is_active": False}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_active"] is False

    @pytest.mark.asyncio
    async def test_update_user_not_found(self, client: AsyncClient):
        """Test updating non-existent user."""
        response = await client.patch(
            "/api/v1/users/99999",
            json={"first_name": "Test"}
        )

        assert response.status_code == 404


class TestUserDelete:
    """Test suite for user deletion."""

    @pytest.mark.asyncio
    async def test_delete_user_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession
    ):
        """Test deleting user."""
        # Create a user to delete
        user = User(
            email="todelete@example.com",
            first_name="Delete",
            last_name="Me",
            is_active=True
        )
        db_session.add(user)
        await db_session.commit()
        await db_session.refresh(user)

        response = await client.delete(f"/api/v1/users/{user.id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_user_not_found(self, client: AsyncClient):
        """Test deleting non-existent user."""
        response = await client.delete("/api/v1/users/99999")

        assert response.status_code == 404
