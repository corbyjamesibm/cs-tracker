from sqlalchemy import String, DateTime, Enum as SQLEnum, ForeignKey, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.use_case_solution_mapping import UseCaseTPSolutionMapping


class UseCaseStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    IMPLEMENTED = "implemented"
    OPTIMIZED = "optimized"


class UseCase(Base):
    """Master list of use cases/features that can be tracked per customer"""
    __tablename__ = "use_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    solution_area: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "WFM", "HPM", "EAP", "POM", "FPM"
    domain: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "Strategic Planning", "Portfolio Management"
    category: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # e.g., "Core Features", "Integrations"
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer_use_cases: Mapped[list["CustomerUseCase"]] = relationship(back_populates="use_case")
    tp_solution_mappings: Mapped[List["UseCaseTPSolutionMapping"]] = relationship(
        back_populates="use_case", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<UseCase {self.name}>"


class CustomerUseCase(Base):
    """Tracking of use case status per customer"""
    __tablename__ = "customer_use_cases"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    use_case_id: Mapped[int] = mapped_column(ForeignKey("use_cases.id"))

    status: Mapped[UseCaseStatus] = mapped_column(SQLEnum(UseCaseStatus), default=UseCaseStatus.NOT_STARTED)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Who last updated
    updated_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    partner_updated_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("partner_users.id"), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="use_cases")
    use_case: Mapped["UseCase"] = relationship(back_populates="customer_use_cases")

    def __repr__(self) -> str:
        return f"<CustomerUseCase {self.customer_id}:{self.use_case_id}>"
