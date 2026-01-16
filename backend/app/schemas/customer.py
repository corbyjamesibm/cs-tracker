from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime, date
from decimal import Decimal

from app.models.customer import HealthStatus, AdoptionStage


class CustomerBase(BaseModel):
    name: str
    salesforce_id: Optional[str] = None
    account_manager: Optional[str] = None
    products_owned: Optional[List[str]] = []
    health_status: HealthStatus = HealthStatus.GREEN
    health_score: Optional[int] = None
    adoption_stage: AdoptionStage = AdoptionStage.ONBOARDING
    arr: Optional[Decimal] = None
    mrr: Optional[Decimal] = None
    renewal_date: Optional[date] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


class CustomerCreate(CustomerBase):
    csm_owner_id: Optional[int] = None
    partner_id: Optional[int] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    salesforce_id: Optional[str] = None
    account_manager: Optional[str] = None
    csm_owner_id: Optional[int] = None
    products_owned: Optional[List[str]] = None
    health_status: Optional[HealthStatus] = None
    health_score: Optional[int] = None
    health_trend: Optional[str] = None
    health_override_reason: Optional[str] = None
    adoption_stage: Optional[AdoptionStage] = None
    arr: Optional[Decimal] = None
    mrr: Optional[Decimal] = None
    renewal_date: Optional[date] = None
    contract_start_date: Optional[date] = None
    contract_end_date: Optional[date] = None
    industry: Optional[str] = None
    employee_count: Optional[str] = None
    partner_id: Optional[int] = None
    custom_fields: Optional[dict[str, Any]] = None


class UserSummary(BaseModel):
    """Minimal user info for nested responses."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    first_name: str
    last_name: str

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class CustomerResponse(CustomerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    csm_owner_id: Optional[int] = None
    csm_owner: Optional[UserSummary] = None
    partner_id: Optional[int] = None
    health_trend: Optional[str] = None
    adoption_percentage: Optional[int] = None
    last_contact_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    days_to_renewal: Optional[int] = None


class CustomerListResponse(BaseModel):
    items: List[CustomerResponse]
    total: int
    skip: int
    limit: int


class CustomerDetailResponse(CustomerResponse):
    contacts: List["ContactResponse"] = []
    custom_fields: Optional[dict[str, Any]] = None


# Contact schemas
class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    is_primary: bool = False


class ContactCreate(ContactBase):
    pass


class ContactResponse(ContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    created_at: datetime


CustomerDetailResponse.model_rebuild()


# Adoption Stage schemas
class AdoptionStageUpdate(BaseModel):
    adoption_stage: AdoptionStage
    notes: Optional[str] = None


class AdoptionHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    customer_id: int
    from_stage: Optional[AdoptionStage] = None
    to_stage: AdoptionStage
    changed_by_id: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
