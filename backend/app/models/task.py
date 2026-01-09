from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from datetime import datetime
import enum

from app.core.database import Base


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customers.id"), nullable=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    priority: Mapped[TaskPriority] = mapped_column(SQLEnum(TaskPriority), default=TaskPriority.MEDIUM)
    status: Mapped[TaskStatus] = mapped_column(SQLEnum(TaskStatus), default=TaskStatus.OPEN, index=True)

    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    completion_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    assignee_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # For partner-created tasks
    partner_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partner_users.id"), nullable=True)

    # Link to engagement if created from one
    engagement_id: Mapped[Optional[int]] = mapped_column(ForeignKey("engagements.id"), nullable=True)

    # Reminder settings
    reminder_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    reminder_sent: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped[Optional["Customer"]] = relationship(back_populates="tasks")
    assignee: Mapped[Optional["User"]] = relationship(back_populates="tasks", foreign_keys=[assignee_id])
    created_by: Mapped[Optional["User"]] = relationship(back_populates="created_tasks", foreign_keys=[created_by_id])
    engagement: Mapped[Optional["Engagement"]] = relationship(back_populates="tasks")

    @property
    def is_overdue(self) -> bool:
        if self.due_date and self.status in [TaskStatus.OPEN, TaskStatus.IN_PROGRESS]:
            return datetime.now(self.due_date.tzinfo) > self.due_date
        return False

    def __repr__(self) -> str:
        return f"<Task {self.title}>"
