"""
Customer API Tests

Comprehensive tests for customer CRUD operations, contacts, and adoption tracking.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.customer import Customer, HealthStatus, AdoptionStage, Contact
from app.models.user import User


class TestCustomerList:
    """Test suite for customer listing and filtering."""

    @pytest.mark.asyncio
    async def test_list_customers_empty(self, client: AsyncClient):
        """Test listing customers when none exist."""
        response = await client.get("/api/v1/customers")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["skip"] == 0
        assert data["limit"] == 50

    @pytest.mark.asyncio
    async def test_list_customers_with_data(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test listing customers returns existing customers."""
        response = await client.get("/api/v1/customers")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

        customer = data["items"][0]
        assert customer["name"] == test_customer.name
        assert customer["id"] == test_customer.id

    @pytest.mark.asyncio
    async def test_list_customers_pagination(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        data_factory
    ):
        """Test customer list pagination."""
        # Create multiple customers
        await data_factory.create_customers(db_session, count=10)

        # Test first page
        response = await client.get("/api/v1/customers?skip=0&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5
        assert data["total"] == 10
        assert data["skip"] == 0
        assert data["limit"] == 5

        # Test second page
        response = await client.get("/api/v1/customers?skip=5&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert len(data["items"]) == 5

    @pytest.mark.asyncio
    async def test_list_customers_filter_health_status(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        data_factory
    ):
        """Test filtering customers by health status."""
        await data_factory.create_customers(db_session, count=6)

        response = await client.get("/api/v1/customers?health_status=green")
        assert response.status_code == 200
        data = response.json()

        for customer in data["items"]:
            assert customer["health_status"] == "green"

    @pytest.mark.asyncio
    async def test_list_customers_filter_csm_owner(
        self,
        client: AsyncClient,
        test_customer: Customer,
        test_user: User
    ):
        """Test filtering customers by CSM owner."""
        response = await client.get(f"/api/v1/customers?csm_owner_id={test_user.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1

    @pytest.mark.asyncio
    async def test_list_customers_search(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test searching customers by name."""
        response = await client.get("/api/v1/customers?search=Test")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert "Test" in data["items"][0]["name"]

    @pytest.mark.asyncio
    async def test_list_customers_sorting(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        data_factory
    ):
        """Test sorting customers."""
        await data_factory.create_customers(db_session, count=5)

        # Sort by name ascending
        response = await client.get("/api/v1/customers?sort_by=name&sort_order=asc")
        assert response.status_code == 200
        data = response.json()
        names = [c["name"] for c in data["items"]]
        assert names == sorted(names)

        # Sort by name descending
        response = await client.get("/api/v1/customers?sort_by=name&sort_order=desc")
        assert response.status_code == 200
        data = response.json()
        names = [c["name"] for c in data["items"]]
        assert names == sorted(names, reverse=True)


class TestCustomerCreate:
    """Test suite for customer creation."""

    @pytest.mark.asyncio
    async def test_create_customer_minimal(self, client: AsyncClient):
        """Test creating customer with minimal required fields."""
        response = await client.post(
            "/api/v1/customers",
            json={"name": "New Customer"}
        )

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "New Customer"
        assert data["id"] is not None
        assert data["health_status"] == "green"  # Default
        assert data["adoption_stage"] == "onboarding"  # Default

    @pytest.mark.asyncio
    async def test_create_customer_full(self, client: AsyncClient, test_user: User):
        """Test creating customer with all fields."""
        customer_data = {
            "name": "Full Customer Corp",
            "salesforce_id": "SF-99999",
            "products_owned": ["Product A", "Product B"],
            "health_status": "yellow",
            "health_score": 75,
            "adoption_stage": "adoption",
            "arr": 250000,
            "mrr": 20833,
            "renewal_date": "2025-12-31",
            "contract_start_date": "2024-01-01",
            "contract_end_date": "2025-12-31",
            "industry": "Finance",
            "employee_count": "1001-5000",
            "website": "https://fullcustomer.com",
            "csm_owner_id": test_user.id
        }

        response = await client.post("/api/v1/customers", json=customer_data)

        assert response.status_code == 201
        data = response.json()
        assert data["name"] == "Full Customer Corp"
        assert data["salesforce_id"] == "SF-99999"
        assert data["health_status"] == "yellow"
        assert data["arr"] == "250000"  # May be string due to Decimal
        assert data["industry"] == "Finance"

    @pytest.mark.asyncio
    async def test_create_customer_invalid_health_status(self, client: AsyncClient):
        """Test creating customer with invalid health status."""
        response = await client.post(
            "/api/v1/customers",
            json={"name": "Test", "health_status": "invalid"}
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_customer_missing_name(self, client: AsyncClient):
        """Test creating customer without required name field."""
        response = await client.post(
            "/api/v1/customers",
            json={"salesforce_id": "SF-123"}
        )

        assert response.status_code == 422


class TestCustomerGet:
    """Test suite for getting individual customers."""

    @pytest.mark.asyncio
    async def test_get_customer_success(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test getting existing customer by ID."""
        response = await client.get(f"/api/v1/customers/{test_customer.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_customer.id
        assert data["name"] == test_customer.name
        assert "contacts" in data  # Detail response includes contacts

    @pytest.mark.asyncio
    async def test_get_customer_not_found(self, client: AsyncClient):
        """Test getting non-existent customer."""
        response = await client.get("/api/v1/customers/99999")

        assert response.status_code == 404
        data = response.json()
        assert "not found" in data["detail"].lower()


class TestCustomerUpdate:
    """Test suite for customer updates."""

    @pytest.mark.asyncio
    async def test_update_customer_partial(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test partial customer update."""
        response = await client.patch(
            f"/api/v1/customers/{test_customer.id}",
            json={"name": "Updated Customer Name"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "Updated Customer Name"
        assert data["health_status"] == test_customer.health_status.value

    @pytest.mark.asyncio
    async def test_update_customer_health_status(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test updating customer health status."""
        response = await client.patch(
            f"/api/v1/customers/{test_customer.id}",
            json={
                "health_status": "red",
                "health_override_reason": "Critical issues identified"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["health_status"] == "red"

    @pytest.mark.asyncio
    async def test_update_customer_not_found(self, client: AsyncClient):
        """Test updating non-existent customer."""
        response = await client.patch(
            "/api/v1/customers/99999",
            json={"name": "Test"}
        )

        assert response.status_code == 404


class TestCustomerDelete:
    """Test suite for customer deletion."""

    @pytest.mark.asyncio
    async def test_delete_customer_success(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test deleting existing customer."""
        response = await client.delete(f"/api/v1/customers/{test_customer.id}")

        assert response.status_code == 204

        # Verify deletion
        response = await client.get(f"/api/v1/customers/{test_customer.id}")
        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_customer_not_found(self, client: AsyncClient):
        """Test deleting non-existent customer."""
        response = await client.delete("/api/v1/customers/99999")

        assert response.status_code == 404


class TestCustomerContacts:
    """Test suite for customer contact management."""

    @pytest.mark.asyncio
    async def test_add_contact(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test adding contact to customer."""
        contact_data = {
            "first_name": "John",
            "last_name": "Doe",
            "email": "john.doe@example.com",
            "phone": "+1-555-0100",
            "role": "IT Director",
            "is_primary": True
        }

        response = await client.post(
            f"/api/v1/customers/{test_customer.id}/contacts",
            json=contact_data
        )

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == "John"
        assert data["last_name"] == "Doe"
        assert data["customer_id"] == test_customer.id

    @pytest.mark.asyncio
    async def test_list_contacts(
        self,
        client: AsyncClient,
        test_customer: Customer,
        db_session: AsyncSession
    ):
        """Test listing contacts for customer."""
        # Add a contact first
        contact = Contact(
            customer_id=test_customer.id,
            first_name="Jane",
            last_name="Smith",
            email="jane@example.com"
        )
        db_session.add(contact)
        await db_session.commit()

        response = await client.get(f"/api/v1/customers/{test_customer.id}/contacts")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_add_contact_customer_not_found(self, client: AsyncClient):
        """Test adding contact to non-existent customer."""
        response = await client.post(
            "/api/v1/customers/99999/contacts",
            json={"first_name": "Test", "last_name": "User"}
        )

        assert response.status_code == 404


class TestAdoptionStage:
    """Test suite for adoption stage tracking."""

    @pytest.mark.asyncio
    async def test_update_adoption_stage(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test updating customer adoption stage."""
        response = await client.patch(
            f"/api/v1/customers/{test_customer.id}/adoption-stage",
            json={
                "adoption_stage": "value_realization",
                "notes": "Customer achieved key milestones"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data["adoption_stage"] == "value_realization"

    @pytest.mark.asyncio
    async def test_get_adoption_history(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test getting adoption history after stage change."""
        # First update the stage
        await client.patch(
            f"/api/v1/customers/{test_customer.id}/adoption-stage",
            json={"adoption_stage": "expansion"}
        )

        # Get history
        response = await client.get(
            f"/api/v1/customers/{test_customer.id}/adoption-history"
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @pytest.mark.asyncio
    async def test_adoption_stage_no_change(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test adoption stage update with same stage (no history entry)."""
        current_stage = test_customer.adoption_stage.value

        response = await client.patch(
            f"/api/v1/customers/{test_customer.id}/adoption-stage",
            json={"adoption_stage": current_stage}
        )

        assert response.status_code == 200
