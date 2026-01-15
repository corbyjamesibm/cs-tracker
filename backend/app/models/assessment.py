from sqlalchemy import String, Integer, DateTime, Enum as SQLEnum, ForeignKey, Text, Float, Date, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from typing import Optional, List, Any
from datetime import datetime, date
import enum

from app.core.database import Base


class AssessmentStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class AssessmentTemplate(Base):
    """Master template for SPM maturity assessments - admin managed"""
    __tablename__ = "assessment_templates"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(255), index=True)  # "SPM Maturity Assessment v2.0"
    version: Mapped[str] = mapped_column(String(50))  # "2.0"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)  # Only one active at a time

    created_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    dimensions: Mapped[List["AssessmentDimension"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="AssessmentDimension.display_order"
    )
    questions: Mapped[List["AssessmentQuestion"]] = relationship(
        back_populates="template", cascade="all, delete-orphan", order_by="AssessmentQuestion.display_order"
    )
    customer_assessments: Mapped[List["CustomerAssessment"]] = relationship(back_populates="template")
    created_by: Mapped[Optional["User"]] = relationship()

    def __repr__(self) -> str:
        return f"<AssessmentTemplate {self.name} v{self.version}>"


class AssessmentDimension(Base):
    """Dimensions/categories for the spider chart axes (e.g., People, Process, Technology)"""
    __tablename__ = "assessment_dimensions"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("assessment_templates.id"))

    name: Mapped[str] = mapped_column(String(100))  # "People", "Process", "Technology"
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    weight: Mapped[float] = mapped_column(Float, default=1.0)  # For weighted scoring

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template: Mapped["AssessmentTemplate"] = relationship(back_populates="dimensions")
    questions: Mapped[List["AssessmentQuestion"]] = relationship(back_populates="dimension")

    def __repr__(self) -> str:
        return f"<AssessmentDimension {self.name}>"


class AssessmentQuestion(Base):
    """Individual assessment questions"""
    __tablename__ = "assessment_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    template_id: Mapped[int] = mapped_column(ForeignKey("assessment_templates.id"))
    dimension_id: Mapped[int] = mapped_column(ForeignKey("assessment_dimensions.id"))

    question_text: Mapped[str] = mapped_column(Text)
    question_number: Mapped[str] = mapped_column(String(20))  # "1.1", "2.3" etc.
    min_score: Mapped[int] = mapped_column(Integer, default=1)
    max_score: Mapped[int] = mapped_column(Integer, default=5)
    score_labels: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, default=dict)  # {"1": "Not Started", "2": "Initial", ...}
    display_order: Mapped[int] = mapped_column(Integer, default=0)
    is_required: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    template: Mapped["AssessmentTemplate"] = relationship(back_populates="questions")
    dimension: Mapped["AssessmentDimension"] = relationship(back_populates="questions")
    responses: Mapped[List["AssessmentResponse"]] = relationship(back_populates="question")

    def __repr__(self) -> str:
        return f"<AssessmentQuestion {self.question_number}>"


class CustomerAssessment(Base):
    """A specific assessment instance for a customer"""
    __tablename__ = "customer_assessments"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"))
    template_id: Mapped[int] = mapped_column(ForeignKey("assessment_templates.id"))

    assessment_date: Mapped[date] = mapped_column(Date, default=date.today)
    status: Mapped[AssessmentStatus] = mapped_column(SQLEnum(AssessmentStatus), default=AssessmentStatus.DRAFT)
    overall_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # Calculated average
    dimension_scores: Mapped[Optional[dict[str, Any]]] = mapped_column(JSONB, default=dict)  # {"People": 3.5, "Process": 4.0, ...}

    completed_by_id: Mapped[Optional[int]] = mapped_column(ForeignKey("users.id"), nullable=True)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship(back_populates="assessments")
    template: Mapped["AssessmentTemplate"] = relationship(back_populates="customer_assessments")
    completed_by: Mapped[Optional["User"]] = relationship()
    responses: Mapped[List["AssessmentResponse"]] = relationship(
        back_populates="customer_assessment", cascade="all, delete-orphan"
    )

    def calculate_scores(self) -> None:
        """Calculate overall and dimension scores from responses"""
        if not self.responses:
            print(f"DEBUG: No responses found for assessment {self.id}")
            return

        print(f"DEBUG: Calculating scores for {len(self.responses)} responses")

        # Group responses by dimension
        dimension_totals: dict[str, list[int]] = {}
        for response in self.responses:
            try:
                if response.question is None:
                    print(f"DEBUG: response.question is None for response {response.id}")
                    continue
                if response.question.dimension is None:
                    print(f"DEBUG: response.question.dimension is None for question {response.question_id}")
                    continue
                dim_name = response.question.dimension.name
                if dim_name not in dimension_totals:
                    dimension_totals[dim_name] = []
                dimension_totals[dim_name].append(response.score)
            except Exception as e:
                print(f"DEBUG: Error processing response: {e}")
                continue

        print(f"DEBUG: dimension_totals = {dimension_totals}")

        # Calculate dimension averages
        self.dimension_scores = {
            dim: sum(scores) / len(scores)
            for dim, scores in dimension_totals.items()
        }

        print(f"DEBUG: dimension_scores = {self.dimension_scores}")

        # Calculate overall average
        all_scores = [s for scores in dimension_totals.values() for s in scores]
        self.overall_score = sum(all_scores) / len(all_scores) if all_scores else None
        print(f"DEBUG: overall_score = {self.overall_score}")

    def __repr__(self) -> str:
        return f"<CustomerAssessment {self.id} for Customer {self.customer_id}>"


class AssessmentResponse(Base):
    """Individual question responses for an assessment"""
    __tablename__ = "assessment_responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_assessment_id: Mapped[int] = mapped_column(ForeignKey("customer_assessments.id"))
    question_id: Mapped[int] = mapped_column(ForeignKey("assessment_questions.id"))

    score: Mapped[int] = mapped_column(Integer)  # The selected rating
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Optional comment

    answered_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer_assessment: Mapped["CustomerAssessment"] = relationship(back_populates="responses")
    question: Mapped["AssessmentQuestion"] = relationship(back_populates="responses")

    def __repr__(self) -> str:
        return f"<AssessmentResponse Q{self.question_id}={self.score}>"


# Import at bottom to avoid circular imports
from app.models.customer import Customer
from app.models.user import User
