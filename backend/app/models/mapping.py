from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from datetime import datetime

from app.core.database import Base


class DimensionUseCaseMapping(Base):
    """Links assessment dimensions to use cases that improve that dimension."""
    __tablename__ = "dimension_use_case_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    dimension_id: Mapped[int] = mapped_column(ForeignKey("assessment_dimensions.id"), index=True)
    use_case_id: Mapped[int] = mapped_column(ForeignKey("use_cases.id"), index=True)

    # How much this use case improves the dimension (0.0-1.0)
    impact_weight: Mapped[float] = mapped_column(Float, default=0.5)
    # Recommend if dimension score below this threshold
    threshold_score: Mapped[float] = mapped_column(Float, default=3.0)
    # Ordering for recommendations
    priority: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    dimension: Mapped["AssessmentDimension"] = relationship()
    use_case: Mapped["UseCase"] = relationship()

    def __repr__(self) -> str:
        return f"<DimensionUseCaseMapping {self.dimension_id} -> {self.use_case_id}>"


class UseCaseTPFeatureMapping(Base):
    """Links use cases to Targetprocess features."""
    __tablename__ = "use_case_tp_feature_mappings"

    id: Mapped[int] = mapped_column(primary_key=True)
    use_case_id: Mapped[int] = mapped_column(ForeignKey("use_cases.id"), index=True)

    # Targetprocess feature details
    tp_feature_id: Mapped[int] = mapped_column(Integer, index=True)
    tp_feature_name: Mapped[str] = mapped_column(String(500))  # Cached TP feature name
    tp_entity_type: Mapped[str] = mapped_column(String(50), default="Feature")  # Feature, Epic, UserStory
    tp_state: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)  # Cached TP state
    tp_project_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)  # Cached TP project

    # Classification
    is_required: Mapped[bool] = mapped_column(Boolean, default=False)  # Must have for use case
    is_recommended: Mapped[bool] = mapped_column(Boolean, default=True)  # Recommended for use case

    # Metadata
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    last_synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    use_case: Mapped["UseCase"] = relationship()

    def __repr__(self) -> str:
        return f"<UseCaseTPFeatureMapping {self.use_case_id} -> TP#{self.tp_feature_id}>"


class RoadmapRecommendation(Base):
    """Generated recommendations for a customer based on assessment."""
    __tablename__ = "roadmap_recommendations"

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    customer_assessment_id: Mapped[int] = mapped_column(ForeignKey("customer_assessments.id"), index=True)

    # What's being recommended
    use_case_id: Mapped[int] = mapped_column(ForeignKey("use_cases.id"))
    tp_feature_mapping_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("use_case_tp_feature_mappings.id"), nullable=True
    )

    # Recommendation details
    title: Mapped[str] = mapped_column(String(500))
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dimension_name: Mapped[str] = mapped_column(String(100))  # Which dimension this improves
    dimension_score: Mapped[float] = mapped_column(Float)  # Customer's score for that dimension

    # Scoring
    priority_score: Mapped[float] = mapped_column(Float, default=0.0)  # Calculated priority
    improvement_potential: Mapped[float] = mapped_column(Float, default=0.0)  # Expected score improvement

    # Status
    is_accepted: Mapped[bool] = mapped_column(Boolean, default=False)
    is_dismissed: Mapped[bool] = mapped_column(Boolean, default=False)
    accepted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Link to created roadmap item (if accepted)
    roadmap_item_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("roadmap_items.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    customer: Mapped["Customer"] = relationship()
    customer_assessment: Mapped["CustomerAssessment"] = relationship()
    use_case: Mapped["UseCase"] = relationship()
    tp_feature_mapping: Mapped[Optional["UseCaseTPFeatureMapping"]] = relationship()
    roadmap_item: Mapped[Optional["RoadmapItem"]] = relationship()

    def __repr__(self) -> str:
        return f"<RoadmapRecommendation {self.id}: {self.title}>"


# Import at bottom to avoid circular imports
from app.models.assessment import AssessmentDimension, CustomerAssessment
from app.models.use_case import UseCase
from app.models.customer import Customer
from app.models.roadmap import RoadmapItem
