from sqlalchemy import String, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.partner import Partner


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    CSM = "csm"
    ACCOUNT_MANAGER = "account_manager"
    READ_ONLY = "read_only"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    w3id: Mapped[Optional[str]] = mapped_column(String(255), unique=True, nullable=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    role: Mapped[UserRole] = mapped_column(SQLEnum(UserRole), default=UserRole.CSM)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    password_hash: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Partner fields
    is_partner_user: Mapped[bool] = mapped_column(Boolean, default=False)
    partner_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("partners.id"), nullable=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    assigned_customers: Mapped[List["Customer"]] = relationship(back_populates="csm_owner", foreign_keys="Customer.csm_owner_id")
    tasks: Mapped[List["Task"]] = relationship(back_populates="assignee", foreign_keys="Task.assignee_id")
    created_tasks: Mapped[List["Task"]] = relationship(back_populates="created_by", foreign_keys="Task.created_by_id")
    engagements: Mapped[List["Engagement"]] = relationship(back_populates="created_by")
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="system_users")
    owned_risks: Mapped[List["Risk"]] = relationship(back_populates="owner", foreign_keys="Risk.owner_id")
    created_risks: Mapped[List["Risk"]] = relationship(back_populates="created_by", foreign_keys="Risk.created_by_id")
    meeting_notes: Mapped[List["MeetingNote"]] = relationship(back_populates="created_by")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    def __repr__(self) -> str:
        return f"<User {self.email}>"
