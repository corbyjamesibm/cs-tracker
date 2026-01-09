from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime


class PartnerBase(BaseModel):
    name: str
    code: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None


class PartnerCreate(PartnerBase):
    pass


class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class PartnerResponse(PartnerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    created_at: datetime


class PartnerListResponse(BaseModel):
    items: List[PartnerResponse]
    total: int
    skip: int
    limit: int


# Partner User schemas
class PartnerUserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str


class PartnerUserCreate(PartnerUserBase):
    pass


class PartnerUserResponse(PartnerUserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    partner_id: int
    is_active: bool
    full_name: str
    created_at: datetime
    last_login: Optional[datetime] = None
