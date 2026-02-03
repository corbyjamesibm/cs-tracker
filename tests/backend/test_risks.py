"""
Risk API Tests

Tests for risk management endpoints including CRUD, resolution, and summary.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.risk import Risk, RiskSeverity, RiskStatus
from app.models.customer import Customer


class TestRiskList:
    """Test suite for risk listing and filtering."""

    @pytest.mark.asyncio
    async def test_list_risks_empty(self, client: AsyncClient):
        """Test listing risks when none exist."""
        response = await client.get("/api/v1/risks")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_risks_with_data(
        self,
        client: AsyncClient,
        test_risk: Risk
    ):
        """Test listing risks returns existing risks."""
        response = await client.get("/api/v1/risks")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_risks_filter_severity(
        self,
        client: AsyncClient,
        test_risk: Risk
    ):
        """Test filtering risks by severity."""
        response = await client.get("/api/v1/risks?severity=medium")

        assert response.status_code == 200
        data = response.json()
        for risk in data["items"]:
            assert risk["severity"] == "medium"

    @pytest.mark.asyncio
    async def test_list_risks_filter_status(
        self,
        client: AsyncClient,
        test_risk: Risk
    ):
        """Test filtering risks by status."""
        response = await client.get("/api/v1/risks?status=open")

        assert response.status_code == 200
        data = response.json()
        for risk in data["items"]:
            assert risk["status"] == "open"

    @pytest.mark.asyncio
    async def test_list_risks_filter_customer(
        self,
        client: AsyncClient,
        test_risk: Risk,
        test_customer: Customer
    ):
        """Test filtering risks by customer."""
        response = await client.get(f"/api/v1/risks?customer_id={test_customer.id}")

        assert response.status_code == 200
        data = response.json()
        for risk in data["items"]:
            assert risk["customer_id"] == test_customer.id


class TestRiskCreate:
    """Test suite for risk creation."""

    @pytest.mark.asyncio
    async def test_create_risk_minimal(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating risk with minimal fields."""
        response = await client.post(
            "/api/v1/risks",
            json={
                "title": "New Risk",
                "customer_id": test_customer.id
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Risk"
        assert data["status"] == "open"  # Default
        assert data["severity"] == "medium"  # Default

    @pytest.mark.asyncio
    async def test_create_risk_full(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating risk with all fields."""
        risk_data = {
            "title": "Critical Risk",
            "description": "Detailed risk description",
            "severity": "critical",
            "status": "open",
            "category": "renewal",
            "customer_id": test_customer.id,
            "probability_rating": 4,
            "impact_rating": 5,
            "mitigation_plan": "Steps to mitigate the risk"
        }

        response = await client.post("/api/v1/risks", json=risk_data)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Critical Risk"
        assert data["severity"] == "critical"
        assert data["probability_rating"] == 4
        assert data["impact_rating"] == 5
        # Risk score should be calculated (4 * 5 = 20)
        assert data["risk_score"] == 20

    @pytest.mark.asyncio
    async def test_create_risk_invalid_severity(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating risk with invalid severity."""
        response = await client.post(
            "/api/v1/risks",
            json={
                "title": "Test",
                "customer_id": test_customer.id,
                "severity": "invalid"
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_risk_invalid_rating(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating risk with out-of-range rating."""
        response = await client.post(
            "/api/v1/risks",
            json={
                "title": "Test",
                "customer_id": test_customer.id,
                "probability_rating": 10  # Max should be 5
            }
        )

        assert response.status_code == 422


class TestRiskGet:
    """Test suite for getting individual risks."""

    @pytest.mark.asyncio
    async def test_get_risk_success(self, client: AsyncClient, test_risk: Risk):
        """Test getting existing risk by ID."""
        response = await client.get(f"/api/v1/risks/{test_risk.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_risk.id
        assert data["title"] == test_risk.title

    @pytest.mark.asyncio
    async def test_get_risk_not_found(self, client: AsyncClient):
        """Test getting non-existent risk."""
        response = await client.get("/api/v1/risks/99999")

        assert response.status_code == 404


class TestRiskUpdate:
    """Test suite for risk updates."""

    @pytest.mark.asyncio
    async def test_update_risk_title(self, client: AsyncClient, test_risk: Risk):
        """Test updating risk title."""
        response = await client.patch(
            f"/api/v1/risks/{test_risk.id}",
            json={"title": "Updated Risk Title"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Risk Title"

    @pytest.mark.asyncio
    async def test_update_risk_severity(self, client: AsyncClient, test_risk: Risk):
        """Test updating risk severity."""
        response = await client.patch(
            f"/api/v1/risks/{test_risk.id}",
            json={"severity": "critical"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["severity"] == "critical"

    @pytest.mark.asyncio
    async def test_update_risk_status(self, client: AsyncClient, test_risk: Risk):
        """Test updating risk status."""
        response = await client.patch(
            f"/api/v1/risks/{test_risk.id}",
            json={"status": "mitigating"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "mitigating"

    @pytest.mark.asyncio
    async def test_update_risk_ratings(self, client: AsyncClient, test_risk: Risk):
        """Test updating risk probability and impact ratings."""
        response = await client.patch(
            f"/api/v1/risks/{test_risk.id}",
            json={
                "probability_rating": 5,
                "impact_rating": 4
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["probability_rating"] == 5
        assert data["impact_rating"] == 4
        assert data["risk_score"] == 20  # 5 * 4

    @pytest.mark.asyncio
    async def test_update_risk_mitigation(self, client: AsyncClient, test_risk: Risk):
        """Test updating risk mitigation plan."""
        response = await client.patch(
            f"/api/v1/risks/{test_risk.id}",
            json={"mitigation_plan": "New mitigation strategy"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["mitigation_plan"] == "New mitigation strategy"


class TestRiskDelete:
    """Test suite for risk deletion."""

    @pytest.mark.asyncio
    async def test_delete_risk_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test deleting risk."""
        # Create risk to delete
        risk = Risk(
            title="To Delete",
            severity=RiskSeverity.LOW,
            status=RiskStatus.OPEN,
            customer_id=test_customer.id
        )
        db_session.add(risk)
        await db_session.commit()
        await db_session.refresh(risk)

        response = await client.delete(f"/api/v1/risks/{risk.id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_risk_not_found(self, client: AsyncClient):
        """Test deleting non-existent risk."""
        response = await client.delete("/api/v1/risks/99999")

        assert response.status_code == 404


class TestRiskSummary:
    """Test suite for risk summary endpoint."""

    @pytest.mark.asyncio
    async def test_get_risk_summary(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test getting risk summary statistics."""
        # Create some risks with different severities and statuses
        risks = [
            Risk(title="Risk 1", severity=RiskSeverity.CRITICAL, status=RiskStatus.OPEN, customer_id=test_customer.id),
            Risk(title="Risk 2", severity=RiskSeverity.HIGH, status=RiskStatus.OPEN, customer_id=test_customer.id),
            Risk(title="Risk 3", severity=RiskSeverity.MEDIUM, status=RiskStatus.MITIGATING, customer_id=test_customer.id),
            Risk(title="Risk 4", severity=RiskSeverity.LOW, status=RiskStatus.RESOLVED, customer_id=test_customer.id),
        ]
        for risk in risks:
            db_session.add(risk)
        await db_session.commit()

        response = await client.get("/api/v1/risks/summary")

        assert response.status_code == 200
        data = response.json()
        # Summary should contain counts by severity and status
        assert "by_severity" in data or "total" in data


class TestRiskResolve:
    """Test suite for risk resolution endpoint."""

    @pytest.mark.asyncio
    async def test_resolve_risk(self, client: AsyncClient, test_risk: Risk):
        """Test resolving a risk."""
        response = await client.post(
            f"/api/v1/risks/{test_risk.id}/resolve",
            json={"resolution_notes": "Risk has been addressed"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "resolved"

    @pytest.mark.asyncio
    async def test_resolve_risk_not_found(self, client: AsyncClient):
        """Test resolving non-existent risk."""
        response = await client.post(
            "/api/v1/risks/99999/resolve",
            json={"resolution_notes": "Test"}
        )

        assert response.status_code == 404
