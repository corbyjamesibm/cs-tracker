from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, date

from app.models.roadmap import RoadmapItemStatus, RoadmapItemCategory


class RoadmapItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: RoadmapItemCategory = RoadmapItemCategory.FEATURE
    target_quarter: str  # e.g., "Q1 2026"
    target_year: int
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    display_order: int = 0


class RoadmapItemCreate(RoadmapItemBase):
    depends_on_ids: Optional[List[int]] = []


class RoadmapItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[RoadmapItemCategory] = None
    status: Optional[RoadmapItemStatus] = None
    target_quarter: Optional[str] = None
    target_year: Optional[int] = None
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    actual_completion_date: Optional[date] = None
    progress_percent: Optional[int] = None
    notes: Optional[str] = None
    last_update: Optional[str] = None


class RoadmapItemResponse(RoadmapItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_id: int
    status: RoadmapItemStatus
    progress_percent: int
    actual_completion_date: Optional[date] = None
    depends_on_ids: Optional[List[int]] = []
    notes: Optional[str] = None
    last_update: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class RoadmapBase(BaseModel):
    name: str = "Product Roadmap"
    description: Optional[str] = None
    start_date: date
    end_date: date


class RoadmapCreate(RoadmapBase):
    customer_id: int


class RoadmapResponse(RoadmapBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    is_active: bool
    items: List[RoadmapItemResponse] = []
    created_at: datetime
    updated_at: datetime


class RoadmapUpdateCreate(BaseModel):
    quarter: str
    update_text: str


class RoadmapUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_item_id: int
    quarter: str
    update_text: str
    status_at_update: RoadmapItemStatus
    progress_at_update: int
    created_at: datetime
