"""
Health Check API Tests

Tests for application health and status endpoints.
"""

import pytest
from httpx import AsyncClient


class TestHealthEndpoints:
    """Test suite for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """Test basic health check endpoint returns healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "app" in data

    @pytest.mark.asyncio
    async def test_api_health_db(self, client: AsyncClient):
        """Test database health check endpoint."""
        response = await client.get("/api/v1/health/db")

        # May return 200 or 503 depending on DB availability
        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data


class TestAPIDocumentation:
    """Test suite for API documentation endpoints."""

    @pytest.mark.asyncio
    async def test_openapi_schema(self, client: AsyncClient):
        """Test OpenAPI schema is available."""
        response = await client.get("/openapi.json")

        assert response.status_code == 200
        data = response.json()
        assert "openapi" in data
        assert "paths" in data
        assert "info" in data

    @pytest.mark.asyncio
    async def test_docs_endpoint(self, client: AsyncClient):
        """Test Swagger UI docs endpoint."""
        response = await client.get("/docs")

        assert response.status_code == 200
        assert "text/html" in response.headers.get("content-type", "")
