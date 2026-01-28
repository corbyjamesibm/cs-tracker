from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from typing import Optional

from app.core.database import get_db
from app.models.meeting_note import MeetingNote
from app.schemas.meeting_note import (
    MeetingNoteCreate, MeetingNoteUpdate, MeetingNoteResponse, MeetingNoteListResponse
)

router = APIRouter()


@router.get("", response_model=MeetingNoteListResponse)
async def list_meeting_notes(
    db: AsyncSession = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    customer_id: Optional[int] = None,
):
    """List meeting notes with filtering."""
    query = select(MeetingNote)

    if customer_id:
        query = query.where(MeetingNote.customer_id == customer_id)

    query = query.order_by(MeetingNote.meeting_date.desc())

    # Count
    count_query = select(func.count()).select_from(MeetingNote)
    if customer_id:
        count_query = count_query.where(MeetingNote.customer_id == customer_id)
    total = await db.scalar(count_query)

    # Pagination
    query = query.offset(skip).limit(limit)
    query = query.options(
        selectinload(MeetingNote.customer),
        selectinload(MeetingNote.created_by)
    )

    result = await db.execute(query)
    meeting_notes = result.scalars().all()

    return MeetingNoteListResponse(
        items=[MeetingNoteResponse.model_validate(n) for n in meeting_notes],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/{meeting_note_id}", response_model=MeetingNoteResponse)
async def get_meeting_note(meeting_note_id: int, db: AsyncSession = Depends(get_db)):
    """Get a single meeting note."""
    query = select(MeetingNote).where(MeetingNote.id == meeting_note_id).options(
        selectinload(MeetingNote.customer),
        selectinload(MeetingNote.created_by)
    )
    result = await db.execute(query)
    meeting_note = result.scalar_one_or_none()

    if not meeting_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")

    return MeetingNoteResponse.model_validate(meeting_note)


@router.post("", response_model=MeetingNoteResponse, status_code=201)
async def create_meeting_note(
    meeting_note_in: MeetingNoteCreate,
    db: AsyncSession = Depends(get_db)
):
    """Create a new meeting note."""
    meeting_note = MeetingNote(**meeting_note_in.model_dump())
    db.add(meeting_note)
    await db.commit()
    await db.refresh(meeting_note)
    return MeetingNoteResponse.model_validate(meeting_note)


@router.patch("/{meeting_note_id}", response_model=MeetingNoteResponse)
async def update_meeting_note(
    meeting_note_id: int,
    meeting_note_in: MeetingNoteUpdate,
    db: AsyncSession = Depends(get_db)
):
    """Update a meeting note."""
    query = select(MeetingNote).where(MeetingNote.id == meeting_note_id)
    result = await db.execute(query)
    meeting_note = result.scalar_one_or_none()

    if not meeting_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")

    update_data = meeting_note_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(meeting_note, field, value)

    await db.commit()
    await db.refresh(meeting_note)
    return MeetingNoteResponse.model_validate(meeting_note)


@router.delete("/{meeting_note_id}", status_code=204)
async def delete_meeting_note(meeting_note_id: int, db: AsyncSession = Depends(get_db)):
    """Delete a meeting note."""
    query = select(MeetingNote).where(MeetingNote.id == meeting_note_id)
    result = await db.execute(query)
    meeting_note = result.scalar_one_or_none()

    if not meeting_note:
        raise HTTPException(status_code=404, detail="Meeting note not found")

    await db.delete(meeting_note)
    await db.commit()
