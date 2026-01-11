from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime

from app.models.risk import RiskSeverity, RiskStatus, RiskCategory


class UserInfo(BaseModel):
    """Minimal user info for risk responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    email: str


class CustomerInfo(BaseModel):
    """Minimal customer info for risk responses"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str


class RiskBase(BaseModel):
    title: str
    description: Optional[str] = None
    severity: RiskSeverity = RiskSeverity.MEDIUM
    category: Optional[RiskCategory] = None
    impact: Optional[str] = None
    mitigation_plan: Optional[str] = None
    due_date: Optional[datetime] = None


class RiskCreate(RiskBase):
    customer_id: int
    owner_id: Optional[int] = None


class RiskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[RiskSeverity] = None
    status: Optional[RiskStatus] = None
    category: Optional[RiskCategory] = None
    impact: Optional[str] = None
    mitigation_plan: Optional[str] = None
    owner_id: Optional[int] = None
    due_date: Optional[datetime] = None


class RiskResolve(BaseModel):
    resolution_notes: Optional[str] = None


class RiskResponse(RiskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    status: RiskStatus
    owner_id: Optional[int] = None
    owner: Optional[UserInfo] = None
    customer: Optional[CustomerInfo] = None
    created_by_id: Optional[int] = None
    created_by: Optional[UserInfo] = None
    resolved_at: Optional[datetime] = None
    resolution_notes: Optional[str] = None
    is_overdue: bool
    created_at: datetime
    updated_at: datetime


class RiskListResponse(BaseModel):
    items: List[RiskResponse]
    total: int
    skip: int
    limit: int


class RiskSummaryResponse(BaseModel):
    """Summary counts for dashboard"""
    total_open: int
    by_severity: dict[str, int]  # {"critical": 2, "high": 5, ...}
    by_status: dict[str, int]  # {"open": 10, "mitigating": 3, ...}
    overdue_count: int
