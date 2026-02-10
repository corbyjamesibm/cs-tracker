from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Integer, Date, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime, date
import enum

from app.core.database import Base


class RoadmapItemStatus(str, enum.Enum):
    PLANNED = "planned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    DELAYED = "delayed"
    CANCELLED = "cancelled"


class RoadmapItemCategory(str, enum.Enum):
    FEATURE = "feature"
    ENHANCEMENT = "enhancement"
    INTEGRATION = "integration"
    MIGRATION = "migration"
    OPTIMIZATION = "optimization"
    OTHER = "other"


class Roadmap(Base):
    """Product roadmap for a customer - covers 1-2 year timeline"""
    __tablename__ = "roadmaps"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    name: Mapped[str] = mapped_column(String(255), default="Product Roadmap")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Roadmap timeframe
    start_date: Mapped[date] = mapped_column(Date)  # Usually current quarter
    end_date: Mapped[date] = mapped_column(Date)    # 1-2 years out

    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="roadmaps")
    items: Mapped[List["RoadmapItem"]] = relationship(back_populates="roadmap", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Roadmap {self.name} for customer {self.customer_id}>"


class RoadmapItem(Base):
    """Individual items on a product roadmap"""
    __tablename__ = "roadmap_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    roadmap_id: Mapped[int] = mapped_column(ForeignKey("roadmaps.id"), index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Categorization
    category: Mapped[RoadmapItemCategory] = mapped_column(
        SQLEnum(RoadmapItemCategory), default=RoadmapItemCategory.FEATURE
    )
    status: Mapped[RoadmapItemStatus] = mapped_column(
        SQLEnum(RoadmapItemStatus), default=RoadmapItemStatus.PLANNED
    )

    # Timeline - using quarters (Q1 2026, Q2 2026, etc.)
    target_quarter: Mapped[str] = mapped_column(String(10))  # e.g., "Q1 2026"
    target_year: Mapped[int] = mapped_column(Integer)        # e.g., 2026

    # Optional specific dates
    planned_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    planned_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    actual_completion_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Progress tracking (0-100)
    progress_percent: Mapped[int] = mapped_column(Integer, default=0)

    # Ordering within a quarter
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Dependencies (stores IDs of other roadmap items as JSON array)
    depends_on_ids: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Dependency anchor points for manual routing
    # Format: {"<dep_id>": {"from": "right|left|top|bottom", "to": "right|left|top|bottom"}}
    dependency_anchors: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True, default=dict)

    # Tools associated with this roadmap item (e.g., ["Targetprocess", "Costing"])
    tools: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    # Notes and updates
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_update: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Latest quarterly update

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    roadmap: Mapped["Roadmap"] = relationship(back_populates="items")

    def __repr__(self) -> str:
        return f"<RoadmapItem {self.title} ({self.target_quarter})>"


class RoadmapUpdate(Base):
    """Quarterly updates for roadmap items - audit trail"""
    __tablename__ = "roadmap_updates"

    id: Mapped[int] = mapped_column(primary_key=True)
    roadmap_item_id: Mapped[int] = mapped_column(ForeignKey("roadmap_items.id"), index=True)

    quarter: Mapped[str] = mapped_column(String(10))  # e.g., "Q1 2026"
    update_text: Mapped[str] = mapped_column(Text)

    # Status at time of update
    status_at_update: Mapped[RoadmapItemStatus] = mapped_column(SQLEnum(RoadmapItemStatus))
    progress_at_update: Mapped[int] = mapped_column(Integer)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    def __repr__(self) -> str:
        return f"<RoadmapUpdate {self.quarter} for item {self.roadmap_item_id}>"
