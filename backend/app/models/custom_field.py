from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, Any
from datetime import datetime
import enum

from app.core.database import Base


class FieldType(str, enum.Enum):
    TEXT = "text"
    NUMBER = "number"
    CURRENCY = "currency"
    DATE = "date"
    DROPDOWN_SINGLE = "dropdown_single"
    DROPDOWN_MULTI = "dropdown_multi"
    CHECKBOX = "checkbox"
    URL = "url"
    USER_REFERENCE = "user_reference"


class CustomField(Base):
    """Definition of custom fields that can be added to customers"""
    __tablename__ = "custom_fields"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    field_key: Mapped[str] = mapped_column(String(100), unique=True)  # system key for API access
    field_type: Mapped[FieldType] = mapped_column(SQLEnum(FieldType))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Organization
    section: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "Company Info", "Contract"
    display_order: Mapped[int] = mapped_column(Integer, default=0)

    # Validation
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)
    default_value: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # For dropdown fields - stores options as JSON array
    options: Mapped[Optional[list[dict]]] = mapped_column(JSONB, nullable=True)

    # Visibility/permissions (stored as role names)
    visible_to_roles: Mapped[Optional[list[str]]] = mapped_column(JSONB, default=["admin", "manager", "csm"])
    editable_by_roles: Mapped[Optional[list[str]]] = mapped_column(JSONB, default=["admin", "manager", "csm"])
    visible_to_partners: Mapped[bool] = mapped_column(Boolean, default=False)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    values: Mapped[list["CustomFieldValue"]] = relationship(back_populates="custom_field")

    def __repr__(self) -> str:
        return f"<CustomField {self.name}>"


class CustomFieldValue(Base):
    """Actual values of custom fields per customer"""
    __tablename__ = "custom_field_values"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    custom_field_id: Mapped[int] = mapped_column(ForeignKey("custom_fields.id"))

    # Store all values as JSONB for flexibility
    value: Mapped[Optional[Any]] = mapped_column(JSONB, nullable=True)

    updated_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="custom_field_values")
    custom_field: Mapped["CustomField"] = relationship(back_populates="values")

    def __repr__(self) -> str:
        return f"<CustomFieldValue {self.customer_id}:{self.custom_field_id}>"
