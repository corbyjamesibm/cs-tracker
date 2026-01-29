from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class DocumentBase(BaseModel):
    """Base document schema with common fields."""
    filename: str
    original_filename: str
    file_type: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    extra_data: Optional[dict] = None
    source: str = "upload"


class DocumentCreate(DocumentBase):
    """Schema for creating a document."""
    customer_id: int
    engagement_id: Optional[int] = None
    content_text: Optional[str] = None
    content_html: Optional[str] = None
    storage_path: Optional[str] = None
    created_by_id: Optional[int] = None


class DocumentUpdate(BaseModel):
    """Schema for updating a document."""
    filename: Optional[str] = None
    file_type: Optional[str] = None
    extra_data: Optional[dict] = None
    engagement_id: Optional[int] = None


class DocumentResponse(DocumentBase):
    """Schema for document API responses."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    engagement_id: Optional[int] = None
    content_text: Optional[str] = None
    content_html: Optional[str] = None
    storage_path: Optional[str] = None
    created_by_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    """Paginated list of documents."""
    items: List[DocumentResponse]
    total: int
    skip: int
    limit: int


class ParsedEmailResponse(BaseModel):
    """Response from parsing an email file."""
    subject: Optional[str] = None
    from_address: Optional[str] = None
    from_name: Optional[str] = None
    to_addresses: List[str] = []
    cc_addresses: List[str] = []
    date: Optional[datetime] = None
    body_text: Optional[str] = None
    body_html: Optional[str] = None
    attachments: List[dict] = []


class ParsedCalendarResponse(BaseModel):
    """Response from parsing a calendar file."""
    summary: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    organizer: Optional[str] = None
    attendees: List[dict] = []
    recurrence: Optional[str] = None
