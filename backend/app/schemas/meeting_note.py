from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date


class MeetingNoteBase(BaseModel):
    meeting_date: date
    title: str
    attendees: Optional[str] = None
    notes: Optional[str] = None
    action_items: Optional[str] = None
    next_steps: Optional[str] = None


class MeetingNoteCreate(MeetingNoteBase):
    customer_id: int
    created_by_id: Optional[int] = None


class MeetingNoteUpdate(BaseModel):
    meeting_date: Optional[date] = None
    title: Optional[str] = None
    attendees: Optional[str] = None
    notes: Optional[str] = None
    action_items: Optional[str] = None
    next_steps: Optional[str] = None


class MeetingNoteResponse(MeetingNoteBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class MeetingNoteListResponse(BaseModel):
    items: List[MeetingNoteResponse]
    total: int
    skip: int
    limit: int
