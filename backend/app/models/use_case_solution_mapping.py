"""Mapping between Use Cases and TP Solutions."""
from sqlalchemy import Integer, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, TYPE_CHECKING
from datetime import datetime

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.use_case import UseCase
    from app.models.tp_solution import TPSolution


class UseCaseTPSolutionMapping(Base):
    """Links use cases to TargetProcess solutions that enable them."""
    __tablename__ = "use_case_tp_solution_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    use_case_id: Mapped[int] = mapped_column(ForeignKey("use_cases.id"), index=True)
    tp_solution_id: Mapped[int] = mapped_column(ForeignKey("tp_solutions.id"), index=True)

    # Classification
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)  # Must have for use case
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)  # Primary enabler

    # Ordering
    priority: Mapped[int] = mapped_column(Integer, default=0)

    # Notes
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    use_case: Mapped["UseCase"] = relationship(back_populates="tp_solution_mappings")
    tp_solution: Mapped["TPSolution"] = relationship(back_populates="use_case_mappings")

    def __repr__(self) -> str:
        return f"<UseCaseTPSolutionMapping UC:{self.use_case_id} -> Sol:{self.tp_solution_id}>"
