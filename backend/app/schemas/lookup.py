from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


class LookupValueBase(BaseModel):
    category: str
    value: str
    label: str
    description: Optional[str] = None
    display_order: int = 0
    is_active: bool = True


class LookupValueCreate(LookupValueBase):
    pass


class LookupValueUpdate(BaseModel):
    value: Optional[str] = None
    label: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None


class LookupValueResponse(LookupValueBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class LookupValueListResponse(BaseModel):
    items: List[LookupValueResponse]
    total: int


class LookupCategoryResponse(BaseModel):
    """Response for a single category with its values."""
    category: str
    values: List[LookupValueResponse]


class LookupCategoriesResponse(BaseModel):
    """Response listing all available categories."""
    categories: List[str]
