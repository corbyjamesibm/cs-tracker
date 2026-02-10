from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Dict
from datetime import datetime, date

from app.models.roadmap import RoadmapItemStatus, RoadmapItemCategory


# Anchor configuration for a single dependency
class DependencyAnchor(BaseModel):
    from_anchor: str = "right"  # right, left, top, bottom
    to_anchor: str = "left"     # right, left, top, bottom


class RoadmapItemBase(BaseModel):
    title: str
    description: Optional[str] = None
    category: RoadmapItemCategory = RoadmapItemCategory.FEATURE
    target_quarter: str  # e.g., "Q1 2026"
    target_year: int
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    display_order: int = 0
    tools: Optional[List[str]] = None  # e.g., ["Targetprocess", "Costing"]


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
    display_order: Optional[int] = None  # Vertical ordering within category
    notes: Optional[str] = None
    last_update: Optional[str] = None
    tools: Optional[List[str]] = None
    depends_on_ids: Optional[List[int]] = None  # IDs of items this depends on
    dependency_anchors: Optional[Dict[str, DependencyAnchor]] = None  # Anchor points for dependencies


class RoadmapItemResponse(RoadmapItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_id: int
    status: RoadmapItemStatus
    progress_percent: int
    actual_completion_date: Optional[date] = None
    depends_on_ids: Optional[List[int]] = []
    dependency_anchors: Optional[Dict[str, DependencyAnchor]] = None
    tools: Optional[List[str]] = None
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


# Portfolio Status Report Schemas
class PortfolioRoadmapItemResponse(BaseModel):
    """Roadmap item with customer context for portfolio view"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    roadmap_id: int
    customer_id: int
    customer_name: str
    title: str
    description: Optional[str] = None
    category: RoadmapItemCategory
    status: RoadmapItemStatus
    target_quarter: str
    target_year: int
    planned_start_date: Optional[date] = None
    planned_end_date: Optional[date] = None
    progress_percent: int
    depends_on_ids: Optional[List[int]] = []
    notes: Optional[str] = None
    last_update: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class StatusCount(BaseModel):
    """Count of items by status"""
    planned: int = 0
    in_progress: int = 0
    completed: int = 0
    delayed: int = 0
    cancelled: int = 0


class CategoryCount(BaseModel):
    """Count of items by category"""
    feature: int = 0
    enhancement: int = 0
    integration: int = 0
    migration: int = 0
    optimization: int = 0
    other: int = 0


class QuarterSummary(BaseModel):
    """Summary of items for a specific quarter"""
    quarter: str  # e.g., "Q1 2026"
    year: int
    total_items: int = 0
    status_breakdown: StatusCount
    items: List[PortfolioRoadmapItemResponse] = []


class PortfolioRoadmapStatusResponse(BaseModel):
    """Complete portfolio roadmap status report"""
    # Summary counts
    total_items: int
    total_customers_with_roadmaps: int
    status_counts: StatusCount
    category_counts: CategoryCount

    # Items by quarter
    quarters: List[QuarterSummary]

    # All items flat list (for table view)
    all_items: List[PortfolioRoadmapItemResponse]
