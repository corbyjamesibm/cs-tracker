from sqlalchemy import String, Integer, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime

from app.core.database import Base


class LookupValue(Base):
    """Configurable lookup values for dropdown lists."""
    __tablename__ = "lookup_values"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Category identifies the dropdown list (e.g., "industry", "employee_count", "solution_area", "domain")
    category: Mapped[str] = mapped_column(String(50), index=True)

    # The actual value stored in the database
    value: Mapped[str] = mapped_column(String(100))

    # Display label (what the user sees)
    label: Mapped[str] = mapped_column(String(200))

    # Optional description for tooltips or help text
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Display order within the category
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Whether this option is active/visible
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<LookupValue {self.category}:{self.value}>"
