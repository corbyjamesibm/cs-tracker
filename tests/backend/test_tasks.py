"""
Task API Tests

Tests for task management endpoints including CRUD and status updates.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date, timedelta

from app.models.task import Task, TaskStatus, TaskPriority
from app.models.customer import Customer
from app.models.user import User


class TestTaskList:
    """Test suite for task listing and filtering."""

    @pytest.mark.asyncio
    async def test_list_tasks_empty(self, client: AsyncClient):
        """Test listing tasks when none exist."""
        response = await client.get("/api/v1/tasks")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_tasks_with_data(
        self,
        client: AsyncClient,
        test_task: Task
    ):
        """Test listing tasks returns existing tasks."""
        response = await client.get("/api/v1/tasks")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] >= 1
        assert len(data["items"]) >= 1

    @pytest.mark.asyncio
    async def test_list_tasks_filter_status(
        self,
        client: AsyncClient,
        test_task: Task
    ):
        """Test filtering tasks by status."""
        response = await client.get("/api/v1/tasks?status=open")

        assert response.status_code == 200
        data = response.json()
        for task in data["items"]:
            assert task["status"] == "open"

    @pytest.mark.asyncio
    async def test_list_tasks_filter_priority(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer,
        test_user: User
    ):
        """Test filtering tasks by priority."""
        # Create task with specific priority
        task = Task(
            title="High Priority Task",
            status=TaskStatus.OPEN,
            priority=TaskPriority.HIGH,
            customer_id=test_customer.id,
            assignee_id=test_user.id
        )
        db_session.add(task)
        await db_session.commit()

        response = await client.get("/api/v1/tasks?priority=high")

        assert response.status_code == 200
        data = response.json()
        for task in data["items"]:
            assert task["priority"] == "high"

    @pytest.mark.asyncio
    async def test_list_tasks_filter_customer(
        self,
        client: AsyncClient,
        test_task: Task,
        test_customer: Customer
    ):
        """Test filtering tasks by customer."""
        response = await client.get(f"/api/v1/tasks?customer_id={test_customer.id}")

        assert response.status_code == 200
        data = response.json()
        for task in data["items"]:
            assert task["customer_id"] == test_customer.id

    @pytest.mark.asyncio
    async def test_list_tasks_filter_assignee(
        self,
        client: AsyncClient,
        test_task: Task,
        test_user: User
    ):
        """Test filtering tasks by assignee."""
        response = await client.get(f"/api/v1/tasks?assignee_id={test_user.id}")

        assert response.status_code == 200
        data = response.json()
        for task in data["items"]:
            assert task["assignee_id"] == test_user.id


class TestTaskCreate:
    """Test suite for task creation."""

    @pytest.mark.asyncio
    async def test_create_task_minimal(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating task with minimal fields."""
        response = await client.post(
            "/api/v1/tasks",
            json={
                "title": "New Task",
                "customer_id": test_customer.id
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "New Task"
        assert data["status"] == "open"  # Default
        assert data["priority"] == "medium"  # Default

    @pytest.mark.asyncio
    async def test_create_task_full(
        self,
        client: AsyncClient,
        test_customer: Customer,
        test_user: User
    ):
        """Test creating task with all fields."""
        due_date = (date.today() + timedelta(days=7)).isoformat()
        task_data = {
            "title": "Full Task",
            "description": "Task with all fields populated",
            "status": "in_progress",
            "priority": "high",
            "customer_id": test_customer.id,
            "assignee_id": test_user.id,
            "due_date": due_date
        }

        response = await client.post("/api/v1/tasks", json=task_data)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Full Task"
        assert data["description"] == "Task with all fields populated"
        assert data["status"] == "in_progress"
        assert data["priority"] == "high"

    @pytest.mark.asyncio
    async def test_create_task_invalid_status(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating task with invalid status."""
        response = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Test",
                "customer_id": test_customer.id,
                "status": "invalid_status"
            }
        )

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_task_missing_title(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating task without required title."""
        response = await client.post(
            "/api/v1/tasks",
            json={"customer_id": test_customer.id}
        )

        assert response.status_code == 422


class TestTaskGet:
    """Test suite for getting individual tasks."""

    @pytest.mark.asyncio
    async def test_get_task_success(self, client: AsyncClient, test_task: Task):
        """Test getting existing task by ID."""
        response = await client.get(f"/api/v1/tasks/{test_task.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == test_task.id
        assert data["title"] == test_task.title

    @pytest.mark.asyncio
    async def test_get_task_not_found(self, client: AsyncClient):
        """Test getting non-existent task."""
        response = await client.get("/api/v1/tasks/99999")

        assert response.status_code == 404


class TestTaskUpdate:
    """Test suite for task updates."""

    @pytest.mark.asyncio
    async def test_update_task_title(self, client: AsyncClient, test_task: Task):
        """Test updating task title."""
        response = await client.patch(
            f"/api/v1/tasks/{test_task.id}",
            json={"title": "Updated Task Title"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Task Title"

    @pytest.mark.asyncio
    async def test_update_task_status(self, client: AsyncClient, test_task: Task):
        """Test updating task status."""
        response = await client.patch(
            f"/api/v1/tasks/{test_task.id}",
            json={"status": "in_progress"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "in_progress"

    @pytest.mark.asyncio
    async def test_update_task_complete(self, client: AsyncClient, test_task: Task):
        """Test completing a task."""
        response = await client.patch(
            f"/api/v1/tasks/{test_task.id}",
            json={"status": "completed"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"

    @pytest.mark.asyncio
    async def test_update_task_priority(self, client: AsyncClient, test_task: Task):
        """Test updating task priority."""
        response = await client.patch(
            f"/api/v1/tasks/{test_task.id}",
            json={"priority": "urgent"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["priority"] == "urgent"

    @pytest.mark.asyncio
    async def test_update_task_assignee(
        self,
        client: AsyncClient,
        test_task: Task,
        admin_user: User
    ):
        """Test reassigning task."""
        response = await client.patch(
            f"/api/v1/tasks/{test_task.id}",
            json={"assignee_id": admin_user.id}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["assignee_id"] == admin_user.id

    @pytest.mark.asyncio
    async def test_update_task_not_found(self, client: AsyncClient):
        """Test updating non-existent task."""
        response = await client.patch(
            "/api/v1/tasks/99999",
            json={"title": "Test"}
        )

        assert response.status_code == 404


class TestTaskDelete:
    """Test suite for task deletion."""

    @pytest.mark.asyncio
    async def test_delete_task_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test deleting task."""
        # Create task to delete
        task = Task(
            title="To Delete",
            status=TaskStatus.OPEN,
            customer_id=test_customer.id
        )
        db_session.add(task)
        await db_session.commit()
        await db_session.refresh(task)

        response = await client.delete(f"/api/v1/tasks/{task.id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_task_not_found(self, client: AsyncClient):
        """Test deleting non-existent task."""
        response = await client.delete("/api/v1/tasks/99999")

        assert response.status_code == 404
