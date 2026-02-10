"""TargetProcess Solutions model for documenting TP features."""
from sqlalchemy import String, DateTime, Boolean, Text, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from datetime import datetime
from typing import List, TYPE_CHECKING
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.use_case_solution_mapping import UseCaseTPSolutionMapping


class TPSolutionCategory(str, enum.Enum):
    """Categories of TargetProcess Solutions."""
    CORE_SOLUTIONS = "core_solutions"
    SOLUTION_COMPONENTS = "solution_components"
    BUDGETING_COMPONENTS = "budgeting_components"
    EXTENSIONS = "extensions"
    AUTOMATIONS = "automations"
    INTEGRATIONS = "integrations"


class ProductType(str, enum.Enum):
    """Product types for solutions - maps to assessment frameworks."""
    TARGETPROCESS = "targetprocess"  # SPM - TargetProcess solutions
    APPTIO1 = "apptio1"  # TBM - Apptio 1 features
    APPTIO_CLOUDABILITY = "apptio_cloudability"  # FinOps - Cloudability features


class TPSolution(Base):
    """
    TargetProcess Solution - represents a solution/feature available in TargetProcess.

    This is used to document TP capabilities and track which solutions
    customers have installed or should consider implementing.
    """
    __tablename__ = "tp_solutions"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Solution identification
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    version: Mapped[str] = mapped_column(String(20))

    # Categorization
    category: Mapped[TPSolutionCategory] = mapped_column(
        SQLEnum(TPSolutionCategory, values_callable=lambda x: [e.value for e in x]),
        index=True
    )

    # Product type - which product/framework this solution belongs to
    product_type: Mapped[str] = mapped_column(
        String(50), default="targetprocess", index=True
    )

    # Description and documentation
    description: Mapped[str] = mapped_column(Text, nullable=True)

    # Extended documentation (for future use)
    documentation_url: Mapped[str] = mapped_column(String(500), nullable=True)
    prerequisites: Mapped[str] = mapped_column(Text, nullable=True)  # JSON list of prerequisite solution names
    related_solutions: Mapped[str] = mapped_column(Text, nullable=True)  # JSON list of related solution names

    # Use case mapping (which CS Tracker use cases this enables)
    use_case_tags: Mapped[str] = mapped_column(Text, nullable=True)  # JSON list of use case tags

    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    use_case_mappings: Mapped[List["UseCaseTPSolutionMapping"]] = relationship(
        back_populates="tp_solution", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<TPSolution {self.name} ({self.version})>"
