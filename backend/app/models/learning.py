"""
Adaptive Learning System Models

Tables for capturing advisor feedback, tracking mapping effectiveness,
and recording weight adjustment history for the recommendation system.
"""

from sqlalchemy import String, Integer, DateTime, ForeignKey, Text, Float, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from typing import Optional
from datetime import datetime

from app.core.database import Base


class RecommendationFeedback(Base):
    """Captures detailed feedback when advisors interact with recommendations."""
    __tablename__ = "recommendation_feedback"

    id: Mapped[int] = mapped_column(primary_key=True)
    recommendation_id: Mapped[int] = mapped_column(
        ForeignKey("roadmap_recommendations.id"), index=True
    )

    # Feedback type: 'accept', 'dismiss', 'rating'
    action: Mapped[str] = mapped_column(String(20))

    # Quality rating (1-5 stars, null if not provided)
    quality_rating: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Quick thumbs feedback (True=up, False=down, None=not provided)
    thumbs_feedback: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)

    # Context at time of feedback
    priority_score_at_feedback: Mapped[float] = mapped_column(Float)
    dimension_score_at_feedback: Mapped[float] = mapped_column(Float)

    # Optional feedback details
    feedback_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    dismiss_reason_category: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    # Categories: 'not_relevant', 'already_planned', 'too_expensive',
    #             'customer_declined', 'wrong_timing', 'other'

    # Who provided feedback
    advisor_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    recommendation: Mapped["RoadmapRecommendation"] = relationship()
    advisor: Mapped["User"] = relationship()

    def __repr__(self) -> str:
        return f"<RecommendationFeedback {self.id}: {self.action}>"


class MappingEffectiveness(Base):
    """Aggregated effectiveness metrics for dimension-use-case mappings."""
    __tablename__ = "mapping_effectiveness"

    id: Mapped[int] = mapped_column(primary_key=True)
    mapping_id: Mapped[int] = mapped_column(
        ForeignKey("dimension_use_case_mappings.id"), unique=True, index=True
    )

    # Counts
    total_recommendations: Mapped[int] = mapped_column(Integer, default=0)
    accept_count: Mapped[int] = mapped_column(Integer, default=0)
    dismiss_count: Mapped[int] = mapped_column(Integer, default=0)
    rating_count: Mapped[int] = mapped_column(Integer, default=0)
    thumbs_up_count: Mapped[int] = mapped_column(Integer, default=0)
    thumbs_down_count: Mapped[int] = mapped_column(Integer, default=0)

    # Aggregated scores
    total_rating_sum: Mapped[float] = mapped_column(Float, default=0.0)
    weighted_rating_sum: Mapped[float] = mapped_column(Float, default=0.0)

    # Calculated metrics (updated by learning service)
    accept_rate: Mapped[float] = mapped_column(Float, default=0.5)
    average_rating: Mapped[float] = mapped_column(Float, default=3.0)
    effectiveness_score: Mapped[float] = mapped_column(Float, default=0.5)

    # Confidence level based on sample size (0-1)
    confidence_level: Mapped[float] = mapped_column(Float, default=0.0)

    last_calculated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationship
    mapping: Mapped["DimensionUseCaseMapping"] = relationship()

    def __repr__(self) -> str:
        return f"<MappingEffectiveness mapping={self.mapping_id} score={self.effectiveness_score:.2f}>"


class WeightAdjustmentHistory(Base):
    """Audit trail for all mapping weight changes."""
    __tablename__ = "weight_adjustment_history"

    id: Mapped[int] = mapped_column(primary_key=True)
    mapping_id: Mapped[int] = mapped_column(
        ForeignKey("dimension_use_case_mappings.id"), index=True
    )

    # What changed: 'impact_weight', 'priority', 'threshold_score'
    field_changed: Mapped[str] = mapped_column(String(50))
    old_value: Mapped[float] = mapped_column(Float)
    new_value: Mapped[float] = mapped_column(Float)

    # Why it changed: 'automatic', 'manual', 'reset'
    adjustment_type: Mapped[str] = mapped_column(String(30))
    # Trigger: 'feedback_threshold', 'scheduled', 'admin_override'
    trigger_event: Mapped[str] = mapped_column(String(50))

    # Context at time of adjustment
    feedback_count_at_adjustment: Mapped[int] = mapped_column(Integer)
    accept_rate_at_adjustment: Mapped[float] = mapped_column(Float)
    average_rating_at_adjustment: Mapped[float] = mapped_column(Float)
    confidence_level_at_adjustment: Mapped[float] = mapped_column(Float)

    # Human-readable explanation
    explanation: Mapped[str] = mapped_column(Text)

    # Who/what triggered (null for automatic)
    triggered_by_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relationships
    mapping: Mapped["DimensionUseCaseMapping"] = relationship()
    triggered_by: Mapped[Optional["User"]] = relationship()

    def __repr__(self) -> str:
        return f"<WeightAdjustmentHistory {self.id}: {self.field_changed} {self.old_value}->{self.new_value}>"


class LearningConfig(Base):
    """Configuration parameters for the adaptive learning system."""
    __tablename__ = "learning_config"

    id: Mapped[int] = mapped_column(primary_key=True)
    key: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    value: Mapped[str] = mapped_column(Text)
    value_type: Mapped[str] = mapped_column(String(20))  # 'float', 'int', 'bool', 'json'
    description: Mapped[str] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __repr__(self) -> str:
        return f"<LearningConfig {self.key}={self.value}>"


# Default configuration values
LEARNING_CONFIG_DEFAULTS = {
    "min_feedback_for_adjustment": {
        "value": "5",
        "type": "int",
        "description": "Minimum feedback events before adjusting weights"
    },
    "confidence_threshold": {
        "value": "0.6",
        "type": "float",
        "description": "Minimum confidence level to apply automatic adjustments"
    },
    "max_weight_change_per_cycle": {
        "value": "0.1",
        "type": "float",
        "description": "Maximum weight change allowed per adjustment cycle"
    },
    "recency_decay_half_life_days": {
        "value": "90",
        "type": "int",
        "description": "Half-life in days for feedback recency weighting"
    },
    "cold_start_weight": {
        "value": "0.5",
        "type": "float",
        "description": "Default impact weight for new mappings with no feedback"
    },
    "learning_enabled": {
        "value": "true",
        "type": "bool",
        "description": "Enable or disable automatic weight adjustments"
    },
    "adjustment_frequency_hours": {
        "value": "24",
        "type": "int",
        "description": "How often to run automatic adjustment cycles (in hours)"
    },
}


# Import at bottom to avoid circular imports
from app.models.mapping import RoadmapRecommendation, DimensionUseCaseMapping
from app.models.user import User
