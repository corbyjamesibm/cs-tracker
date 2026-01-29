from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, ForeignKey, Text, Numeric, Date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal
import enum

from app.core.database import Base


class HealthStatus(str, enum.Enum):
    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"


class AdoptionStage(str, enum.Enum):
    ONBOARDING = "onboarding"
    ADOPTION = "adoption"
    VALUE_REALIZATION = "value_realization"
    EXPANSION = "expansion"
    RENEWAL = "renewal"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Required fields (per PRD)
    name: Mapped[str] = mapped_column(String(255), index=True)
    salesforce_id: Mapped[Optional[str]] = mapped_column(String(50), unique=True, nullable=True, index=True)

    # Ownership
    csm_owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    account_manager_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)

    # Products (stored as JSON array)
    products_owned: Mapped[Optional[List[str]]] = mapped_column(JSONB, default=list)

    # Health
    health_status: Mapped[HealthStatus] = mapped_column(SQLEnum(HealthStatus), default=HealthStatus.GREEN)
    health_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)  # 0-100
    health_trend: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # improving, stable, declining
    health_override_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Adoption
    adoption_stage: Mapped[AdoptionStage] = mapped_column(SQLEnum(AdoptionStage), default=AdoptionStage.ONBOARDING)
    adoption_stage_entered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    adoption_percentage: Mapped[Optional[int]] = mapped_column(Integer, default=0)  # 0-100

    # Financials
    arr: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    mrr: Mapped[Optional[Decimal]] = mapped_column(Numeric(12, 2), nullable=True)
    contract_start_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    contract_end_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    renewal_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True, index=True)

    # Company info
    industry: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    employee_count: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    website: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Partner
    partner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partners.id"), nullable=True)

    # Integration IDs
    gainsight_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)
    targetprocess_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True, index=True)

    # Custom fields (JSONB for flexibility)
    custom_fields: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, default=dict)

    # AI-optimized: embedding vector storage (for future semantic search)
    # Will be added via pgvector extension

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_contact_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    csm_owner: Mapped[Optional["User"]] = relationship(back_populates="assigned_customers", foreign_keys=[csm_owner_id])
    account_manager: Mapped[Optional["User"]] = relationship(foreign_keys=[account_manager_id])
    partner: Mapped[Optional["Partner"]] = relationship(back_populates="customers")
    tasks: Mapped[List["Task"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    engagements: Mapped[List["Engagement"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    contacts: Mapped[List["Contact"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    use_cases: Mapped[List["CustomerUseCase"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    custom_field_values: Mapped[List["CustomFieldValue"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    adoption_history: Mapped[List["AdoptionHistory"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    risks: Mapped[List["Risk"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    assessments: Mapped[List["CustomerAssessment"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    roadmaps: Mapped[List["Roadmap"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    meeting_notes: Mapped[List["MeetingNote"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    documents: Mapped[List["Document"]] = relationship(back_populates="customer", cascade="all, delete-orphan")

    @property
    def days_to_renewal(self) -> Optional[int]:
        if self.renewal_date:
            delta = self.renewal_date - date.today()
            return delta.days
        return None

    def __repr__(self) -> str:
        return f"<Customer {self.name}>"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))

    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    role: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="contacts")

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class AdoptionHistory(Base):
    __tablename__ = "adoption_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))

    from_stage: Mapped[Optional[AdoptionStage]] = mapped_column(SQLEnum(AdoptionStage), nullable=True)
    to_stage: Mapped[AdoptionStage] = mapped_column(SQLEnum(AdoptionStage))
    changed_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    customer: Mapped["Customer"] = relationship(back_populates="adoption_history")
