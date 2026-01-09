from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.models.use_case import UseCaseStatus


class UseCaseBase(BaseModel):
    name: str
    description: Optional[str] = None
    solution_area: Optional[str] = None  # WFM, HPM, EAP, POM, FPM
    domain: Optional[str] = None  # Strategic Planning, Portfolio Management, etc.
    category: Optional[str] = None
    display_order: int = 0


class UseCaseCreate(UseCaseBase):
    pass


class UseCaseResponse(UseCaseBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class UseCaseListResponse(BaseModel):
    items: List[UseCaseResponse]
    total: int
    skip: int
    limit: int


# Customer-specific use case tracking
class CustomerUseCaseUpdate(BaseModel):
    status: UseCaseStatus
    notes: Optional[str] = None
    updated_by_id: Optional[int] = None


class CustomerUseCaseResponse(BaseModel):
    id: Optional[int] = None
    use_case_id: int
    customer_id: int
    name: str
    solution_area: Optional[str] = None
    domain: Optional[str] = None
    category: Optional[str] = None
    status: UseCaseStatus
    notes: Optional[str] = None
    updated_at: Optional[datetime] = None
