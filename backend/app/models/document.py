from sqlalchemy import String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from datetime import datetime

from app.core.database import Base


class Document(Base):
    """
    Document model for storing files attached to customers.
    Supports emails (.eml), calendar events (.ics), and other file types.
    """
    __tablename__ = "documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    engagement_id: Mapped[Optional[int]] = mapped_column(ForeignKey("engagements.id"), nullable=True)

    # File information
    filename: Mapped[str] = mapped_column(String(255))
    original_filename: Mapped[str] = mapped_column(String(255))
    file_type: Mapped[str] = mapped_column(String(50), index=True)  # email, calendar, pdf, etc.
    mime_type: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Content storage (for emails/text files)
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # File storage path (for binary files)
    storage_path: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Extra data (email headers, calendar details, etc.)
    extra_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)

    # Source tracking
    source: Mapped[str] = mapped_column(String(50), default="upload")  # upload, drag_drop, outlook

    # Audit fields
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="documents")
    engagement: Mapped[Optional["Engagement"]] = relationship()
    created_by: Mapped[Optional["User"]] = relationship()

    def __repr__(self) -> str:
        return f"<Document {self.file_type}: {self.original_filename}>"
