from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from datetime import datetime


# =============================================================================
# Dimension -> Use Case Mapping Schemas
# =============================================================================

class DimensionUseCaseMappingBase(BaseModel):
    dimension_id: int
    use_case_id: int
    impact_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    threshold_score: float = Field(default=3.0, ge=1.0, le=5.0)
    priority: int = 0


class DimensionUseCaseMappingCreate(DimensionUseCaseMappingBase):
    pass


class DimensionUseCaseMappingUpdate(BaseModel):
    impact_weight: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    threshold_score: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    priority: Optional[int] = None


class DimensionUseCaseMappingResponse(DimensionUseCaseMappingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    # Nested info for display
    dimension_name: Optional[str] = None
    use_case_name: Optional[str] = None
    solution_area: Optional[str] = None


class DimensionUseCaseMappingListResponse(BaseModel):
    items: List[DimensionUseCaseMappingResponse]
    total: int


# =============================================================================
# Use Case -> TP Feature Mapping Schemas
# =============================================================================

class UseCaseTPFeatureMappingBase(BaseModel):
    use_case_id: int
    tp_feature_id: int
    tp_feature_name: str
    tp_entity_type: str = "Feature"
    tp_state: Optional[str] = None
    tp_project_name: Optional[str] = None
    is_required: bool = False
    is_recommended: bool = True
    notes: Optional[str] = None


class UseCaseTPFeatureMappingCreate(UseCaseTPFeatureMappingBase):
    pass


class UseCaseTPFeatureMappingUpdate(BaseModel):
    tp_feature_name: Optional[str] = None
    tp_entity_type: Optional[str] = None
    tp_state: Optional[str] = None
    tp_project_name: Optional[str] = None
    is_required: Optional[bool] = None
    is_recommended: Optional[bool] = None
    notes: Optional[str] = None


class UseCaseTPFeatureMappingResponse(UseCaseTPFeatureMappingBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    last_synced_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    # Nested info for display
    use_case_name: Optional[str] = None
    solution_area: Optional[str] = None


class UseCaseTPFeatureMappingListResponse(BaseModel):
    items: List[UseCaseTPFeatureMappingResponse]
    total: int


# =============================================================================
# TP Search Result Schema (for searching Targetprocess)
# =============================================================================

class TPSearchResult(BaseModel):
    id: int
    name: str
    entity_type: str
    state: Optional[str] = None
    project: Optional[str] = None
    description: Optional[str] = None


class TPSearchResponse(BaseModel):
    items: List[TPSearchResult]
    total: int


# =============================================================================
# Roadmap Recommendation Schemas
# =============================================================================

class RoadmapRecommendationBase(BaseModel):
    title: str
    description: Optional[str] = None
    dimension_name: str
    dimension_score: float
    priority_score: float
    improvement_potential: float


class RoadmapRecommendationResponse(RoadmapRecommendationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    customer_assessment_id: int
    use_case_id: int
    tp_feature_mapping_id: Optional[int] = None
    is_accepted: bool
    is_dismissed: bool
    accepted_at: Optional[datetime] = None
    roadmap_item_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    # Nested info for display
    use_case_name: Optional[str] = None
    solution_area: Optional[str] = None
    tp_feature_name: Optional[str] = None
    tp_feature_id: Optional[int] = None
    tp_entity_type: Optional[str] = None


class RoadmapRecommendationListResponse(BaseModel):
    items: List[RoadmapRecommendationResponse]
    total: int
    # Summary info
    weak_dimensions: Optional[List[dict]] = None  # [{"name": "People", "score": 2.5}, ...]


class GenerateRecommendationsRequest(BaseModel):
    customer_id: int
    threshold: float = Field(default=3.5, ge=1.0, le=5.0)
    limit: int = Field(default=20, ge=1, le=100)
    regenerate: bool = False  # Clear existing recommendations before generating


class AcceptRecommendationRequest(BaseModel):
    target_quarter: str  # e.g., "Q2"
    target_year: int  # e.g., 2026
    notes: Optional[str] = None


class RecommendationActionResponse(BaseModel):
    success: bool
    message: str
    recommendation_id: int
    roadmap_item_id: Optional[int] = None
