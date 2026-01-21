from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, TYPE_CHECKING
from datetime import datetime
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.user import User


class RiskSeverity(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskStatus(str, enum.Enum):
    OPEN = "open"
    MITIGATING = "mitigating"
    RESOLVED = "resolved"
    ACCEPTED = "accepted"


class RiskCategory(str, enum.Enum):
    ADOPTION = "adoption"
    RENEWAL = "renewal"
    TECHNICAL = "technical"
    RELATIONSHIP = "relationship"
    FINANCIAL = "financial"
    OTHER = "other"


class Risk(Base):
    __tablename__ = "risks"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    severity: Mapped[RiskSeverity] = mapped_column(
        SQLEnum(RiskSeverity), default=RiskSeverity.MEDIUM, index=True
    )
    status: Mapped[RiskStatus] = mapped_column(
        SQLEnum(RiskStatus), default=RiskStatus.OPEN, index=True
    )
    category: Mapped[Optional[RiskCategory]] = mapped_column(
        SQLEnum(RiskCategory), nullable=True
    )

    # Risk ratings (1-5 scale)
    probability_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    impact_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Impact and mitigation
    impact: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    mitigation_plan: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Ownership and tracking
    owner_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    due_date: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Resolution
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    resolution_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Audit
    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="risks")
    owner: Mapped[Optional["User"]] = relationship(
        back_populates="owned_risks", foreign_keys=[owner_id]
    )
    created_by: Mapped[Optional["User"]] = relationship(
        back_populates="created_risks", foreign_keys=[created_by_id]
    )

    @property
    def is_overdue(self) -> bool:
        """Check if risk is past due date and still open."""
        if self.due_date and self.status in [RiskStatus.OPEN, RiskStatus.MITIGATING]:
            now = datetime.now(self.due_date.tzinfo) if self.due_date.tzinfo else datetime.utcnow()
            return now > self.due_date
        return False

    @property
    def risk_score(self) -> Optional[int]:
        """Calculate risk score (probability * impact). Returns None if either rating is missing."""
        if self.probability_rating is not None and self.impact_rating is not None:
            return self.probability_rating * self.impact_rating
        return None

    def __repr__(self) -> str:
        return f"<Risk {self.title} ({self.severity.value})>"
