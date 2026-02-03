"""Pydantic schemas for multi-assessment support (SPM, TBM, FinOps)."""
from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


# === Assessment Type Schemas ===

class AssessmentTypeBase(BaseModel):
    """Base assessment type fields"""
    code: str
    name: str
    short_name: str
    description: Optional[str] = None
    color: str
    display_order: int = 0
    is_active: bool = True


class AssessmentTypeCreate(AssessmentTypeBase):
    """Create a new assessment type"""
    pass


class AssessmentTypeUpdate(BaseModel):
    """Update an existing assessment type"""
    name: Optional[str] = None
    short_name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class AssessmentTypeResponse(AssessmentTypeBase):
    """Assessment type response with metadata"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class AssessmentTypeListResponse(BaseModel):
    """List of assessment types"""
    items: List[AssessmentTypeResponse]
    total: int


# === Type-Specific Report Schemas ===

class DimensionScoreDetail(BaseModel):
    """Detailed dimension score for type-specific reports"""
    name: str
    score: Optional[float] = None
    target: Optional[float] = None
    gap: Optional[float] = None
    weight: float = 1.0
    question_count: int = 0


class TypeSpecificScores(BaseModel):
    """Scores for a specific assessment type"""
    assessment_type_code: str
    assessment_type_name: str
    assessment_type_color: str
    assessment_id: Optional[int] = None
    assessment_date: Optional[datetime] = None
    overall_score: Optional[float] = None
    dimensions: List[DimensionScoreDetail] = []
    has_assessment: bool = False


class TypeSpecificRecommendation(BaseModel):
    """Recommendation from a specific assessment type"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    dimension_name: str
    dimension_score: float
    priority_score: float
    improvement_potential: float
    use_case_id: int
    use_case_name: Optional[str] = None
    is_accepted: bool = False
    is_dismissed: bool = False
    assessment_type_code: str
    assessment_type_color: str


class TypeSpecificReport(BaseModel):
    """Full report for a single assessment type"""
    assessment_type: AssessmentTypeResponse
    scores: TypeSpecificScores
    recommendations: List[TypeSpecificRecommendation] = []
    recommendation_count: int = 0


# === Cross-Type Analysis Schemas ===

class CrossTypeInsight(BaseModel):
    """Insight from cross-type analysis"""
    insight_type: str  # 'synergy', 'conflict', 'gap', 'strength'
    title: str
    description: str
    affected_types: List[str] = []  # e.g., ["spm", "tbm"]
    severity: str = "info"  # 'info', 'warning', 'success'


class CrossTypeAnalysis(BaseModel):
    """Analysis of patterns across assessment types"""
    common_weak_dimensions: List[str] = []
    common_strong_dimensions: List[str] = []
    type_coverage: dict[str, bool] = {}  # {"spm": true, "tbm": false, "finops": true}
    insights: List[CrossTypeInsight] = []
    synergy_opportunities: int = 0


# === Aggregated Recommendation Schemas ===

class AggregatedRecommendationResponse(BaseModel):
    """Aggregated recommendation across assessment types"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    use_case_id: int
    use_case_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    source_assessment_types: List[str] = []
    source_recommendation_ids: List[int] = []
    combined_priority_score: float
    base_priority_score: float
    is_synergistic: bool
    estimated_effort: Optional[str] = None
    target_quarter: Optional[str] = None
    target_year: Optional[int] = None
    is_accepted: bool = False
    is_dismissed: bool = False
    roadmap_item_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime


class AggregatedRecommendationListResponse(BaseModel):
    """List of aggregated recommendations"""
    items: List[AggregatedRecommendationResponse]
    total: int
    synergistic_count: int = 0


# === Overall Section Schemas ===

class OverallTypeScore(BaseModel):
    """Score summary for a single type in overall view"""
    type_code: str
    type_name: str
    short_name: str
    color: str
    overall_score: Optional[float] = None
    has_assessment: bool = False
    assessment_date: Optional[datetime] = None


class OverallSection(BaseModel):
    """Overall composite scores across all assessment types"""
    overall_maturity_score: Optional[float] = None
    type_scores: List[OverallTypeScore] = []
    assessment_coverage: int = 0  # Number of types with assessments
    total_types: int = 3  # Total assessment types available


# === Unified Roadmap Schemas ===

class UnifiedRoadmapItem(BaseModel):
    """Single item in the unified roadmap"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    source_assessment_types: List[str] = []  # ["spm", "tbm"]
    is_synergistic: bool = False
    priority_score: float
    estimated_effort: Optional[str] = None  # "S", "M", "L"
    target_quarter: Optional[str] = None  # "Q1", "Q2", etc.
    target_year: Optional[int] = None
    status: str = "planned"  # 'planned', 'in_progress', 'completed'
    roadmap_item_id: Optional[int] = None


class UnifiedRoadmapQuarter(BaseModel):
    """Items grouped by quarter"""
    quarter: str  # "Q1 2026"
    items: List[UnifiedRoadmapItem] = []
    item_count: int = 0


class UnifiedRoadmap(BaseModel):
    """Unified roadmap across all assessment types"""
    customer_id: int
    quarters: List[UnifiedRoadmapQuarter] = []
    total_items: int = 0
    synergistic_items: int = 0
    items_by_type: dict[str, int] = {}  # {"spm": 5, "tbm": 3, "finops": 2}


# === Comprehensive Report Response ===

class ComprehensiveReportResponse(BaseModel):
    """Full multi-type assessment report"""
    customer_id: int
    customer_name: str

    # Per-type reports
    assessment_reports: List[TypeSpecificReport] = []

    # Overall composite
    overall_section: OverallSection

    # Cross-type analysis
    cross_type_analysis: CrossTypeAnalysis

    # Aggregated recommendations (top 10)
    top_recommendations: List[AggregatedRecommendationResponse] = []

    # Unified roadmap summary
    unified_roadmap: UnifiedRoadmap

    # Metadata
    generated_at: datetime
    report_version: str = "1.0"


# === Customer Assessment Summary Schemas ===

class CustomerAssessmentSummaryResponse(BaseModel):
    """Summary of customer's assessments across all types"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    latest_spm_assessment_id: Optional[int] = None
    latest_tbm_assessment_id: Optional[int] = None
    latest_finops_assessment_id: Optional[int] = None
    scores_by_type: dict[str, Any] = {}
    overall_maturity_score: Optional[float] = None
    last_updated_at: datetime
    created_at: datetime


# === Request Schemas ===

class GenerateAggregatedRecommendationsRequest(BaseModel):
    """Request to generate aggregated recommendations"""
    include_dismissed: bool = False
    limit: int = 20


class AcceptAggregatedRecommendationRequest(BaseModel):
    """Request to accept an aggregated recommendation"""
    target_quarter: Optional[str] = None
    target_year: Optional[int] = None
    estimated_effort: Optional[str] = None
    notes: Optional[str] = None


class UpdateAggregatedRecommendationRequest(BaseModel):
    """Update an aggregated recommendation"""
    target_quarter: Optional[str] = None
    target_year: Optional[int] = None
    estimated_effort: Optional[str] = None
    is_accepted: Optional[bool] = None
    is_dismissed: Optional[bool] = None
