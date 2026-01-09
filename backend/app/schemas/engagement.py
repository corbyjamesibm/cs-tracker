from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.models.engagement import EngagementType


class EngagementBase(BaseModel):
    engagement_type: EngagementType
    title: str
    summary: Optional[str] = None
    details: Optional[str] = None
    engagement_date: Optional[datetime] = None
    tags: Optional[List[str]] = []


class EngagementCreate(EngagementBase):
    customer_id: int
    created_by_id: Optional[int] = None
    attendees: Optional[List[dict]] = []


class EngagementUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    details: Optional[str] = None
    engagement_date: Optional[datetime] = None
    tags: Optional[List[str]] = None


class EngagementResponse(EngagementBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    created_by_id: Optional[int] = None
    attendees: Optional[List[dict]] = []
    attachments: Optional[List[dict]] = []
    created_at: datetime
    updated_at: datetime


class EngagementListResponse(BaseModel):
    items: List[EngagementResponse]
    total: int
    skip: int
    limit: int
