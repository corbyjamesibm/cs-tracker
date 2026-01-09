from sqlalchemy import String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List
from datetime import datetime

from app.core.database import Base


class Partner(Base):
    """Partner organization (e.g., Cprime, Rego, Merryville Consulting)"""
    __tablename__ = "partners"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    code: Mapped[str] = mapped_column(String(50), unique=True)  # e.g., 'cprime', 'rego'
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    contact_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    users: Mapped[List["PartnerUser"]] = relationship(back_populates="partner", cascade="all, delete-orphan")
    customers: Mapped[List["Customer"]] = relationship(back_populates="partner")
    system_users: Mapped[List["User"]] = relationship(back_populates="partner")

    def __repr__(self) -> str:
        return f"<Partner {self.name}>"


class PartnerUser(Base):
    """Individual users from partner organizations"""
    __tablename__ = "partner_users"

    id: Mapped[int] = mapped_column(primary_key=True)
    partner_id: Mapped[int] = mapped_column(ForeignKey("partners.id"))

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    partner: Mapped["Partner"] = relationship(back_populates="users")
    assigned_customers: Mapped[List["PartnerCustomerAssignment"]] = relationship(back_populates="partner_user")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<PartnerUser {self.email}>"


class PartnerCustomerAssignment(Base):
    """Many-to-many: Partner users assigned to specific customers"""
    __tablename__ = "partner_customer_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    partner_user_id: Mapped[int] = mapped_column(ForeignKey("partner_users.id"))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))

    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    assigned_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    partner_user: Mapped["PartnerUser"] = relationship(back_populates="assigned_customers")
