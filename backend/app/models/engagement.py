from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime
import enum

from app.core.database import Base


class EngagementType(str, enum.Enum):
    CALL = "call"
    MEETING = "meeting"
    EMAIL = "email"
    QBR = "qbr"
    NOTE = "note"
    ESCALATION = "escalation"
    STATUS_REPORT = "status_report"
    OTHER = "other"


class Engagement(Base):
    __tablename__ = "engagements"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    engagement_type: Mapped[EngagementType] = mapped_column(SQLEnum(EngagementType))
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    details: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    engagement_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=func.now())

    # Tags for filtering
    tags: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), default=list)

    # Attendees/participants (stored as JSON)
    attendees: Mapped[Optional[List[dict]]] = mapped_column(JSONB, default=list)

    # Created by (internal user or partner)
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    partner_user_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partner_users.id"), nullable=True)

    # Attachments (URLs or file references)
    attachments: Mapped[Optional[List[dict]]] = mapped_column(JSONB, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="engagements")
    created_by: Mapped[Optional["User"]] = relationship(back_populates="engagements")
    tasks: Mapped[List["Task"]] = relationship(back_populates="engagement")

    def __repr__(self) -> str:
        return f"<Engagement {self.engagement_type.value}: {self.title}>"
