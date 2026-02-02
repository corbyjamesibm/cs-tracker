"""
Schemas for the Adaptive Learning System
"""

from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# ============================================================
# FEEDBACK SCHEMAS
# ============================================================

class SubmitFeedbackRequest(BaseModel):
    """Request to submit feedback for a recommendation."""
    action: str = Field(..., description="Feedback action: 'accept', 'dismiss', 'rating'")
    quality_rating: Optional[int] = Field(None, ge=1, le=5, description="Quality rating 1-5 stars")
    thumbs_feedback: Optional[bool] = Field(None, description="Thumbs up (True) or down (False)")
    feedback_reason: Optional[str] = Field(None, description="Free text reason")
    dismiss_reason_category: Optional[str] = Field(
        None,
        description="Dismiss reason: 'not_relevant', 'already_planned', 'too_expensive', 'customer_declined', 'wrong_timing', 'other'"
    )
    # For accept action
    target_quarter: Optional[str] = Field(None, description="Target quarter for roadmap item (e.g., 'Q2 2026')")
    target_year: Optional[int] = Field(None, description="Target year for roadmap item")
    notes: Optional[str] = Field(None, description="Optional notes for the roadmap item")


class SubmitFeedbackResponse(BaseModel):
    """Response after submitting feedback."""
    success: bool
    feedback_id: int
    message: str
    roadmap_item_id: Optional[int] = None  # Set if action was 'accept'


class QuickRateRequest(BaseModel):
    """Request for quick rating (thumbs or stars)."""
    rating: Optional[int] = Field(None, ge=1, le=5, description="Star rating 1-5")
    thumbs: Optional[bool] = Field(None, description="Thumbs up (True) or down (False)")


class RecommendationFeedbackResponse(BaseModel):
    """Response model for feedback records."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    recommendation_id: int
    action: str
    quality_rating: Optional[int]
    thumbs_feedback: Optional[bool]
    dismiss_reason_category: Optional[str]
    feedback_reason: Optional[str]
    priority_score_at_feedback: float
    dimension_score_at_feedback: float
    advisor_id: int
    advisor_name: Optional[str] = None
    created_at: datetime


class FeedbackListResponse(BaseModel):
    """List of feedback records."""
    items: List[RecommendationFeedbackResponse]
    total: int


# ============================================================
# EFFECTIVENESS SCHEMAS
# ============================================================

class MappingEffectivenessResponse(BaseModel):
    """Response model for mapping effectiveness metrics."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    mapping_id: int
    dimension_name: Optional[str] = None
    use_case_name: Optional[str] = None
    current_weight: Optional[float] = None
    original_weight: Optional[float] = None
    total_recommendations: int
    accept_count: int
    dismiss_count: int
    rating_count: int
    thumbs_up_count: int
    thumbs_down_count: int
    accept_rate: float
    average_rating: float
    effectiveness_score: float
    confidence_level: float
    last_calculated_at: datetime


class EffectivenessListResponse(BaseModel):
    """List of effectiveness metrics."""
    items: List[MappingEffectivenessResponse]
    total: int
    last_learning_run: Optional[datetime] = None


# ============================================================
# LEARNING RUN SCHEMAS
# ============================================================

class LearningRunRequest(BaseModel):
    """Request to run learning cycle."""
    mapping_ids: Optional[List[int]] = Field(
        None, description="Specific mapping IDs to process (None = all mappings)"
    )
    dry_run: bool = Field(False, description="Preview changes without applying")


class WeightAdjustmentPreview(BaseModel):
    """Preview of a single weight adjustment."""
    mapping_id: int
    dimension_name: str
    use_case_name: str
    field: str
    old_value: float
    new_value: float
    delta: float
    explanation: str
    would_apply: bool  # False if confidence too low


class LearningRunResponse(BaseModel):
    """Response from learning cycle run."""
    adjustments: List[WeightAdjustmentPreview]
    total_evaluated: int
    total_adjusted: int
    skipped_low_confidence: int
    skipped_insufficient_data: int
    dry_run: bool


# ============================================================
# WEIGHT HISTORY SCHEMAS
# ============================================================

class WeightAdjustmentHistoryResponse(BaseModel):
    """Response model for weight adjustment history."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    mapping_id: int
    dimension_name: Optional[str] = None
    use_case_name: Optional[str] = None
    field_changed: str
    old_value: float
    new_value: float
    adjustment_type: str
    trigger_event: str
    explanation: str
    feedback_count_at_adjustment: int
    accept_rate_at_adjustment: float
    average_rating_at_adjustment: float
    confidence_level_at_adjustment: float
    triggered_by_id: Optional[int]
    triggered_by_name: Optional[str] = None
    created_at: datetime


class WeightHistoryListResponse(BaseModel):
    """List of weight adjustment history."""
    items: List[WeightAdjustmentHistoryResponse]
    total: int


# ============================================================
# CONFIGURATION SCHEMAS
# ============================================================

class LearningConfigItem(BaseModel):
    """Single configuration item."""
    key: str
    value: str
    value_type: str
    description: str
    updated_at: Optional[datetime] = None


class LearningConfigResponse(BaseModel):
    """Response model for learning configuration."""
    items: List[LearningConfigItem]


class UpdateConfigRequest(BaseModel):
    """Request to update a config value."""
    value: str


# ============================================================
# SUMMARY/STATS SCHEMAS
# ============================================================

class LearningSummaryResponse(BaseModel):
    """Summary statistics for the learning system."""
    total_feedback_count: int
    total_accepts: int
    total_dismisses: int
    total_ratings: int
    average_accept_rate: float
    average_rating: float
    mappings_with_feedback: int
    mappings_above_confidence_threshold: int
    last_learning_run: Optional[datetime]
    learning_enabled: bool


class DimensionEffectivenessSummary(BaseModel):
    """Effectiveness summary by dimension."""
    dimension_name: str
    mapping_count: int
    average_effectiveness: float
    average_accept_rate: float
    total_feedback: int
