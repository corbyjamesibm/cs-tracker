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
