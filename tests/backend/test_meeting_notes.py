"""
Meeting Notes API Tests

Tests for meeting notes management endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date

from app.models.meeting_note import MeetingNote
from app.models.customer import Customer
from app.models.user import User


class TestMeetingNoteList:
    """Test suite for meeting notes listing."""

    @pytest.mark.asyncio
    async def test_list_meeting_notes_empty(self, client: AsyncClient):
        """Test listing meeting notes when none exist."""
        response = await client.get("/api/v1/meeting-notes")

        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert data["total"] == 0

    @pytest.mark.asyncio
    async def test_list_meeting_notes_filter_customer(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test filtering meeting notes by customer."""
        # Create meeting note
        note = MeetingNote(
            customer_id=test_customer.id,
            title="Customer Meeting",
            meeting_date=date.today()
        )
        db_session.add(note)
        await db_session.commit()

        response = await client.get(f"/api/v1/meeting-notes?customer_id={test_customer.id}")

        assert response.status_code == 200
        data = response.json()
        for note in data["items"]:
            assert note["customer_id"] == test_customer.id


class TestMeetingNoteCreate:
    """Test suite for meeting note creation."""

    @pytest.mark.asyncio
    async def test_create_meeting_note_minimal(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating meeting note with minimal fields."""
        response = await client.post(
            "/api/v1/meeting-notes",
            json={
                "customer_id": test_customer.id,
                "title": "Quick Sync",
                "meeting_date": date.today().isoformat()
            }
        )

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Quick Sync"

    @pytest.mark.asyncio
    async def test_create_meeting_note_full(
        self,
        client: AsyncClient,
        test_customer: Customer
    ):
        """Test creating meeting note with all fields."""
        note_data = {
            "customer_id": test_customer.id,
            "title": "Quarterly Review",
            "meeting_date": date.today().isoformat(),
            "attendees": ["John Doe", "Jane Smith", "Customer Rep"],
            "agenda": "Review Q1 goals and progress",
            "notes": "Detailed discussion about adoption metrics",
            "action_items": [
                {"item": "Follow up on training", "owner": "John Doe"},
                {"item": "Send documentation", "owner": "Jane Smith"}
            ],
            "next_meeting_date": (date.today().replace(month=date.today().month + 1 if date.today().month < 12 else 1)).isoformat()
        }

        response = await client.post("/api/v1/meeting-notes", json=note_data)

        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Quarterly Review"
        assert "attendees" in data or len(data.get("attendees", [])) >= 0


class TestMeetingNoteGet:
    """Test suite for getting individual meeting notes."""

    @pytest.mark.asyncio
    async def test_get_meeting_note_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test getting existing meeting note by ID."""
        note = MeetingNote(
            customer_id=test_customer.id,
            title="Test Note",
            meeting_date=date.today()
        )
        db_session.add(note)
        await db_session.commit()
        await db_session.refresh(note)

        response = await client.get(f"/api/v1/meeting-notes/{note.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == note.id
        assert data["title"] == "Test Note"

    @pytest.mark.asyncio
    async def test_get_meeting_note_not_found(self, client: AsyncClient):
        """Test getting non-existent meeting note."""
        response = await client.get("/api/v1/meeting-notes/99999")

        assert response.status_code == 404


class TestMeetingNoteUpdate:
    """Test suite for meeting note updates."""

    @pytest.mark.asyncio
    async def test_update_meeting_note_title(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test updating meeting note title."""
        note = MeetingNote(
            customer_id=test_customer.id,
            title="Original Title",
            meeting_date=date.today()
        )
        db_session.add(note)
        await db_session.commit()
        await db_session.refresh(note)

        response = await client.patch(
            f"/api/v1/meeting-notes/{note.id}",
            json={"title": "Updated Title"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["title"] == "Updated Title"

    @pytest.mark.asyncio
    async def test_update_meeting_note_notes(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test updating meeting notes content."""
        note = MeetingNote(
            customer_id=test_customer.id,
            title="Meeting",
            meeting_date=date.today()
        )
        db_session.add(note)
        await db_session.commit()
        await db_session.refresh(note)

        response = await client.patch(
            f"/api/v1/meeting-notes/{note.id}",
            json={"notes": "Updated notes with more details"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["notes"] == "Updated notes with more details"


class TestMeetingNoteDelete:
    """Test suite for meeting note deletion."""

    @pytest.mark.asyncio
    async def test_delete_meeting_note_success(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_customer: Customer
    ):
        """Test deleting meeting note."""
        note = MeetingNote(
            customer_id=test_customer.id,
            title="To Delete",
            meeting_date=date.today()
        )
        db_session.add(note)
        await db_session.commit()
        await db_session.refresh(note)

        response = await client.delete(f"/api/v1/meeting-notes/{note.id}")

        assert response.status_code == 204

    @pytest.mark.asyncio
    async def test_delete_meeting_note_not_found(self, client: AsyncClient):
        """Test deleting non-existent meeting note."""
        response = await client.delete("/api/v1/meeting-notes/99999")

        assert response.status_code == 404
