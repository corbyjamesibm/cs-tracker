from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime, date

from app.models.assessment import AssessmentStatus, RecommendationPriority, RecommendationStatus, TemplateStatus


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


# === Assessment Type Info ===

class AssessmentTypeInfo(BaseModel):
    """Minimal assessment type info for embedding in responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    short_name: str
    color: str


# === Assessment Template Schemas ===

class AssessmentTemplateBase(BaseModel):
    name: str
    version: str
    description: Optional[str] = None
    assessment_type_id: Optional[int] = None


class AssessmentTemplateCreate(AssessmentTemplateBase):
    dimensions: Optional[List[AssessmentDimensionCreate]] = None
    questions: Optional[List[AssessmentQuestionCreate]] = None


class AssessmentTemplateUpdate(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    assessment_type_id: Optional[int] = None


class AssessmentTemplateResponse(AssessmentTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    status: str = "active"
    assessment_type_id: Optional[int] = None
    assessment_type: Optional[AssessmentTypeInfo] = None
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
    assessment_type_id: Optional[int] = None


class CustomerAssessmentCreate(CustomerAssessmentBase):
    template_id: int


class CustomerAssessmentUpdate(BaseModel):
    status: Optional[AssessmentStatus] = None
    notes: Optional[str] = None
    assessment_type_id: Optional[int] = None
    assessment_date: Optional[date] = None


class CustomerAssessmentResponse(CustomerAssessmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    template_id: int
    assessment_type_id: Optional[int] = None
    assessment_type: Optional[AssessmentTypeInfo] = None
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
    assessment_type_id: Optional[int] = None


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
    assessment_type_id: Optional[int] = None


class TargetResponse(TargetBase):
    """Target response with metadata"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    assessment_type_id: Optional[int] = None
    assessment_type: Optional[AssessmentTypeInfo] = None
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
    """A node in the flow visualization (dimension, use case, or TP solution)"""
    id: str
    name: str
    type: str  # 'dimension', 'use_case', 'tp_solution'
    # Dimension-specific
    score: Optional[float] = None
    gap: Optional[float] = None
    # Use case-specific
    solution_area: Optional[str] = None
    # TP solution-specific
    tp_id: Optional[int] = None
    is_required: Optional[bool] = None
    category: Optional[str] = None  # TP solution category
    version: Optional[str] = None  # TP solution version


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
    assessment_type_id: Optional[int] = None
    assessment_type_code: Optional[str] = None
    nodes: List[FlowNode] = []
    links: List[FlowLink] = []
    # Summary stats
    weak_dimensions_count: int = 0
    recommended_use_cases_count: int = 0
    tp_solutions_count: int = 0


# === Assessment Recommendation Schemas ===

class AssessmentRecommendationBase(BaseModel):
    """Base recommendation fields"""
    title: str
    description: Optional[str] = None  # Markdown content
    priority: Optional[RecommendationPriority] = RecommendationPriority.MEDIUM
    category: Optional[str] = None
    display_order: int = 0


class AssessmentRecommendationCreate(AssessmentRecommendationBase):
    """Create a new recommendation"""
    created_by: Optional[str] = None


class AssessmentRecommendationUpdate(BaseModel):
    """Update an existing recommendation"""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[RecommendationPriority] = None
    category: Optional[str] = None
    display_order: Optional[int] = None


class AssessmentRecommendationResponse(AssessmentRecommendationBase):
    """Recommendation response with metadata"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    assessment_id: int
    created_by: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AssessmentRecommendationListResponse(BaseModel):
    """List of recommendations for an assessment"""
    items: List[AssessmentRecommendationResponse]
    total: int


# === Customer Recommendation Schemas ===

class CustomerRecommendationBase(BaseModel):
    """Base customer recommendation fields"""
    title: str
    description: Optional[str] = None
    priority: Optional[RecommendationPriority] = RecommendationPriority.MEDIUM
    status: Optional[RecommendationStatus] = RecommendationStatus.OPEN
    category: Optional[str] = None
    assessment_type_id: Optional[int] = None
    expected_impact: Optional[float] = None
    impacted_dimensions: Optional[List[str]] = None
    tools: Optional[List[str]] = None  # e.g., ["Targetprocess", "Costing", "Planning", "Cloudability"]
    due_date: Optional[date] = None


class CustomerRecommendationCreate(CustomerRecommendationBase):
    """Create a new customer recommendation"""
    created_by_id: Optional[int] = None


class CustomerRecommendationUpdate(BaseModel):
    """Update an existing customer recommendation"""
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[RecommendationPriority] = None
    status: Optional[RecommendationStatus] = None
    category: Optional[str] = None
    assessment_type_id: Optional[int] = None
    expected_impact: Optional[float] = None
    impacted_dimensions: Optional[List[str]] = None
    tools: Optional[List[str]] = None
    due_date: Optional[date] = None
    completed_date: Optional[date] = None


class CustomerRecommendationResponse(CustomerRecommendationBase):
    """Customer recommendation response with metadata"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    assessment_type_id: Optional[int] = None
    assessment_type: Optional[AssessmentTypeInfo] = None
    completed_date: Optional[date] = None
    created_by_id: Optional[int] = None
    created_by: Optional[UserInfo] = None
    created_at: datetime
    updated_at: datetime


class CustomerRecommendationListResponse(BaseModel):
    """List of customer recommendations"""
    items: List[CustomerRecommendationResponse]
    total: int


# === Portfolio Summary Schemas ===

class CustomerAssessmentBrief(BaseModel):
    """Brief customer assessment info for portfolio summary"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    customer_name: str
    spm_score: Optional[float] = None
    spm_date: Optional[datetime] = None
    tbm_score: Optional[float] = None
    tbm_date: Optional[datetime] = None
    finops_score: Optional[float] = None
    finops_date: Optional[datetime] = None
    avg_score: Optional[float] = None


class DimensionAggregateScore(BaseModel):
    """Aggregated score for a dimension across all customers"""
    dimension_name: str
    assessment_type: str
    assessment_type_color: str
    avg_score: float
    min_score: float
    max_score: float
    customer_count: int


class PortfolioAssessmentSummary(BaseModel):
    """Portfolio-wide assessment summary"""
    total_customers: int
    customers_assessed: int
    customers_with_spm: int
    customers_with_tbm: int
    customers_with_finops: int
    avg_spm_score: Optional[float] = None
    avg_tbm_score: Optional[float] = None
    avg_finops_score: Optional[float] = None
    dimension_scores: List[DimensionAggregateScore]
    customers: List[CustomerAssessmentBrief]


# === Assessment Builder Schemas ===

class BuilderDimensionCreate(BaseModel):
    """Create a new dimension in a template"""
    name: str
    description: Optional[str] = None
    display_order: int = 0
    weight: float = 1.0


class BuilderDimensionUpdate(BaseModel):
    """Update an existing dimension"""
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    weight: Optional[float] = None


class BuilderQuestionCreate(BaseModel):
    """Create a new question in a template"""
    dimension_id: int
    question_text: str
    question_number: str = ""
    min_score: int = 1
    max_score: int = 5
    score_labels: Optional[dict[str, Any]] = None
    score_descriptions: Optional[dict[str, Any]] = None
    score_evidence: Optional[dict[str, Any]] = None
    display_order: int = 0
    is_required: bool = True


class BuilderQuestionUpdate(BaseModel):
    """Update an existing question"""
    question_text: Optional[str] = None
    question_number: Optional[str] = None
    dimension_id: Optional[int] = None
    min_score: Optional[int] = None
    max_score: Optional[int] = None
    score_labels: Optional[dict[str, Any]] = None
    score_descriptions: Optional[dict[str, Any]] = None
    score_evidence: Optional[dict[str, Any]] = None
    display_order: Optional[int] = None
    is_required: Optional[bool] = None


class BuilderQuestionScoreUpdate(BaseModel):
    """Update score labels, descriptions, and evidence only (no draft required)."""
    score_labels: Optional[dict[str, Any]] = None
    score_descriptions: Optional[dict[str, Any]] = None
    score_evidence: Optional[dict[str, Any]] = None


class BuilderQuestionMinorUpdate(BaseModel):
    """Minor text/number updates allowed on any template status (no draft required)."""
    question_text: Optional[str] = None
    question_number: Optional[str] = None


class BulkReorderItem(BaseModel):
    """Single item in a reorder request"""
    id: int
    display_order: int


class BulkReorderRequest(BaseModel):
    """Bulk reorder dimensions or questions"""
    items: List[BulkReorderItem]


class TemplateCloneRequest(BaseModel):
    """Clone a template as a new draft version"""
    new_version: str
    new_name: Optional[str] = None


class TemplateCloneResponse(BaseModel):
    """Response after cloning a template"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    version: str
    status: str


class TemplateChangeAuditEntry(BaseModel):
    """Single audit trail entry for template changes"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    template_id: int
    entity_type: str
    entity_id: int
    field_name: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    changed_by: Optional[UserInfo] = None
    changed_at: datetime


class TemplateChangeAuditListResponse(BaseModel):
    """Paginated list of template audit entries"""
    items: List[TemplateChangeAuditEntry]
    total: int
