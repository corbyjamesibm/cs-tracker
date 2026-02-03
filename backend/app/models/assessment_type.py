"""Assessment Type model for multi-assessment support (SPM, TBM, FinOps)."""
from sqlalchemy import String, Integer, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional, List, TYPE_CHECKING
from datetime import datetime
import enum

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.assessment import AssessmentTemplate, CustomerAssessment


class AssessmentTypeCode(str, enum.Enum):
    """Enum for assessment type codes."""
    SPM = "spm"
    TBM = "tbm"
    FINOPS = "finops"


class AssessmentType(Base):
    """
    Master table for assessment types (SPM, TBM, FinOps).
    Each type has its own color, display order, and templates.
    """
    __tablename__ = "assessment_types"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(
        String(20), unique=True, index=True
    )  # "spm", "tbm", "finops"
    name: Mapped[str] = mapped_column(String(100))  # "Strategic Portfolio Management"
    short_name: Mapped[str] = mapped_column(String(20))  # "SPM"
    description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    color: Mapped[str] = mapped_column(String(20))  # "#0f62fe"
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    templates: Mapped[List["AssessmentTemplate"]] = relationship(
        back_populates="assessment_type",
        order_by="AssessmentTemplate.created_at.desc()"
    )
    assessments: Mapped[List["CustomerAssessment"]] = relationship(
        back_populates="assessment_type"
    )

    def __repr__(self) -> str:
        return f"<AssessmentType {self.code}: {self.short_name}>"


# Seed data for migration
ASSESSMENT_TYPE_SEED_DATA = [
    {
        "code": AssessmentTypeCode.SPM.value,
        "name": "Strategic Portfolio Management",
        "short_name": "SPM",
        "description": "Assess organizational maturity in strategic portfolio management practices including resource allocation, project prioritization, and portfolio governance.",
        "color": "#0f62fe",
        "display_order": 1,
        "is_active": True,
    },
    {
        "code": AssessmentTypeCode.TBM.value,
        "name": "Technology Business Management",
        "short_name": "TBM",
        "description": "Evaluate technology business management capabilities including IT cost transparency, financial planning, and technology investment optimization.",
        "color": "#198038",
        "display_order": 2,
        "is_active": True,
    },
    {
        "code": AssessmentTypeCode.FINOPS.value,
        "name": "Financial Operations",
        "short_name": "FinOps",
        "description": "Assess cloud financial management and FinOps practices including cost optimization, resource utilization, and cloud governance.",
        "color": "#8a3ffc",
        "display_order": 3,
        "is_active": True,
    },
]
