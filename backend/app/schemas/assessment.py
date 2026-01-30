from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime, date

from app.models.assessment import AssessmentStatus


# === Minimal Info Classes ===

class UserInfo(BaseModel):
    """Minimal user info for assessment responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str


class CustomerInfo(BaseModel):
    """Minimal customer info for assessment responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


# === Assessment Dimension Schemas ===

class AssessmentDimensionBase(BaseModel):
    name: str
    description: Optional[str] = None
    display_order: int = 0
    weight: float = 1.0


class AssessmentDimensionCreate(AssessmentDimensionBase):
    pass


class AssessmentDimensionResponse(AssessmentDimensionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    created_at: datetime


# === Assessment Question Schemas ===

class AssessmentQuestionBase(BaseModel):
    question_text: str
    question_number: str
    min_score: int = 1
    max_score: int = 5
    score_labels: Optional[dict[str, Any]] = None
    score_descriptions: Optional[dict[str, Any]] = None
    score_evidence: Optional[dict[str, Any]] = None
    display_order: int = 0
    is_required: bool = True


class AssessmentQuestionCreate(AssessmentQuestionBase):
    dimension_id: int


class AssessmentQuestionResponse(AssessmentQuestionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    dimension_id: int
    dimension: Optional[AssessmentDimensionResponse] = None
    created_at: datetime


# === Assessment Template Schemas ===

class AssessmentTemplateBase(BaseModel):
    name: str
    version: str
    description: Optional[str] = None


class AssessmentTemplateCreate(AssessmentTemplateBase):
    dimensions: Optional[List[AssessmentDimensionCreate]] = None
    questions: Optional[List[AssessmentQuestionCreate]] = None


class AssessmentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class AssessmentTemplateResponse(AssessmentTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_by_id: Optional[int] = None
    created_by: Optional[UserInfo] = None
    created_at: datetime
    updated_at: datetime


class AssessmentTemplateDetailResponse(AssessmentTemplateResponse):
    """Template with all dimensions and questions"""
    dimensions: List[AssessmentDimensionResponse] = []
    questions: List[AssessmentQuestionResponse] = []


class AssessmentTemplateListResponse(BaseModel):
    items: List[AssessmentTemplateResponse]
    total: int


# === Assessment Response (Individual Answer) Schemas ===

class AssessmentAnswerBase(BaseModel):
    question_id: int
    score: int
    notes: Optional[str] = None


class AssessmentAnswerCreate(AssessmentAnswerBase):
    pass


class AssessmentAnswerResponse(AssessmentAnswerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_assessment_id: int
    answered_at: datetime


class AssessmentAnswerWithQuestion(AssessmentAnswerResponse):
    """Response with full question details for display"""
    question: Optional[AssessmentQuestionResponse] = None


# === Customer Assessment Schemas ===

class CustomerAssessmentBase(BaseModel):
    assessment_date: Optional[date] = None
    notes: Optional[str] = None


class CustomerAssessmentCreate(CustomerAssessmentBase):
    template_id: int


class CustomerAssessmentUpdate(BaseModel):
    status: Optional[AssessmentStatus] = None
    notes: Optional[str] = None


class CustomerAssessmentResponse(CustomerAssessmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    template_id: int
    status: AssessmentStatus
    overall_score: Optional[float] = None
    dimension_scores: Optional[dict[str, Any]] = None
    completed_by_id: Optional[int] = None
    completed_by: Optional[UserInfo] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class CustomerAssessmentDetailResponse(CustomerAssessmentResponse):
    """Assessment with all responses and template info"""
    customer: Optional[CustomerInfo] = None
    template: Optional[AssessmentTemplateResponse] = None
    responses: List[AssessmentAnswerWithQuestion] = []


class CustomerAssessmentListResponse(BaseModel):
    items: List[CustomerAssessmentResponse]
    total: int


# === Batch Response Submission ===

class BatchResponseSubmit(BaseModel):
    """Submit multiple responses at once"""
    responses: List[AssessmentAnswerCreate]
    complete: bool = False  # If true, mark assessment as completed
    completed_by_id: Optional[int] = None  # User ID who completed the assessment


# === History & Comparison ===

class AssessmentComparison(BaseModel):
    """Compare two assessments"""
    current: CustomerAssessmentResponse
    previous: Optional[CustomerAssessmentResponse] = None
    dimension_changes: dict[str, float] = {}  # {"People": +0.5, "Process": -0.2}
    overall_change: Optional[float] = None


class AssessmentHistoryResponse(BaseModel):
    """Customer's assessment history with trend data"""
    assessments: List[CustomerAssessmentResponse]
    comparison: Optional[AssessmentComparison] = None  # Most recent vs previous


# === Excel Upload Schemas ===

class ExcelUploadResult(BaseModel):
    """Result from Excel template upload"""
    success: bool
    template_id: Optional[int] = None
    dimensions_created: int = 0
    questions_created: int = 0
    errors: List[str] = []


class ExcelResponseUploadResult(BaseModel):
    """Result from Excel response upload"""
    success: bool
    assessment_id: Optional[int] = None
    responses_saved: int = 0
    errors: List[str] = []


# === Response Editing Schemas ===

class AssessmentAnswerUpdate(BaseModel):
    """Update an existing response score or notes"""
    score: Optional[int] = None
    notes: Optional[str] = None
    change_reason: str  # Required explanation for the change
    edited_by_id: int  # User making the change


class AssessmentAnswerWithEditInfo(AssessmentAnswerResponse):
    """Response with edit tracking info"""
    last_edited_at: Optional[datetime] = None
    last_edited_by: Optional[UserInfo] = None
    question: Optional[AssessmentQuestionResponse] = None


# === Audit Trail Schemas ===

class AssessmentAuditEntry(BaseModel):
    """Single audit trail entry"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    response_id: int
    customer_assessment_id: int
    question_id: int
    field_changed: str  # 'score' or 'notes'
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    change_reason: Optional[str] = None
    changed_by: Optional[UserInfo] = None
    changed_at: datetime


class AssessmentAuditListResponse(BaseModel):
    """List of audit entries for an assessment"""
    items: List[AssessmentAuditEntry]
    total: int


# === Target Schemas ===

class TargetBase(BaseModel):
    """Base target fields"""
    name: str
    description: Optional[str] = None
    target_date: Optional[date] = None
    target_scores: dict[str, float] = {}  # {"Organization": 4.0, "Strategic Planning": 4.5}
    overall_target: Optional[float] = None
    is_active: bool = True


class TargetCreate(TargetBase):
    """Create a new target"""
    created_by_id: Optional[int] = None


class TargetUpdate(BaseModel):
    """Update an existing target"""
    name: Optional[str] = None
    description: Optional[str] = None
    target_date: Optional[date] = None
    target_scores: Optional[dict[str, float]] = None
    overall_target: Optional[float] = None
    is_active: Optional[bool] = None


class TargetResponse(TargetBase):
    """Target response with metadata"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    created_by_id: Optional[int] = None
    created_by: Optional[UserInfo] = None
    created_at: datetime
    updated_at: datetime


class TargetListResponse(BaseModel):
    """List of targets for a customer"""
    items: List[TargetResponse]
    total: int


# === Gap Analysis Schemas ===

class DimensionGap(BaseModel):
    """Gap analysis for a single dimension"""
    dimension_name: str
    current_score: Optional[float] = None
    target_score: Optional[float] = None
    gap: Optional[float] = None  # target - current (positive = needs improvement)
    status: str  # 'achieved', 'on_track', 'needs_attention', 'at_risk'


class GapAnalysisResponse(BaseModel):
    """Full gap analysis between current assessment and target"""
    target: TargetResponse
    current_overall: Optional[float] = None
    target_overall: Optional[float] = None
    overall_gap: Optional[float] = None
    overall_status: str
    dimension_gaps: List[DimensionGap] = []
    days_to_target: Optional[int] = None


# === Flow Visualization Schemas ===

class FlowNode(BaseModel):
    """A node in the flow visualization (dimension, use case, or TP feature)"""
    id: str
    name: str
    type: str  # 'dimension', 'use_case', 'tp_feature'
    # Dimension-specific
    score: Optional[float] = None
    gap: Optional[float] = None
    # Use case-specific
    solution_area: Optional[str] = None
    # TP feature-specific
    tp_id: Optional[int] = None
    is_required: Optional[bool] = None


class FlowLink(BaseModel):
    """A link between nodes in the flow visualization"""
    source: str
    target: str
    value: float = 1.0
    # For dimension -> use case
    impact_weight: Optional[float] = None
    # For use case -> TP feature
    is_required: Optional[bool] = None


class FlowVisualizationResponse(BaseModel):
    """Flow visualization data for Sankey diagram"""
    customer_id: int
    assessment_id: Optional[int] = None
    nodes: List[FlowNode] = []
    links: List[FlowLink] = []
    # Summary stats
    weak_dimensions_count: int = 0
    recommended_use_cases_count: int = 0
    tp_features_count: int = 0
