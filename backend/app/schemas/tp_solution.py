"""Schemas for TargetProcess Solutions."""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

from app.models.tp_solution import TPSolutionCategory


class TPSolutionBase(BaseModel):
    """Base schema for TP Solution."""
    name: str
    version: str
    category: TPSolutionCategory
    description: Optional[str] = None
    documentation_url: Optional[str] = None
    prerequisites: Optional[str] = None
    related_solutions: Optional[str] = None
    use_case_tags: Optional[str] = None
    is_active: bool = True


class TPSolutionCreate(TPSolutionBase):
    """Schema for creating a TP Solution."""
    pass


class TPSolutionUpdate(BaseModel):
    """Schema for updating a TP Solution."""
    name: Optional[str] = None
    version: Optional[str] = None
    category: Optional[TPSolutionCategory] = None
    description: Optional[str] = None
    documentation_url: Optional[str] = None
    prerequisites: Optional[str] = None
    related_solutions: Optional[str] = None
    use_case_tags: Optional[str] = None
    is_active: Optional[bool] = None


class TPSolutionResponse(TPSolutionBase):
    """Schema for TP Solution response."""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TPSolutionList(BaseModel):
    """Schema for list of TP Solutions."""
    solutions: List[TPSolutionResponse]
    total: int
