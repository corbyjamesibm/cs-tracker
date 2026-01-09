from pydantic import BaseModel, ConfigDict, EmailStr
from typing import Optional, List
from datetime import datetime

from app.models.user import UserRole


class UserBase(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole = UserRole.CSM


class UserCreate(UserBase):
    w3id: Optional[str] = None
    is_partner_user: bool = False
    partner_id: Optional[int] = None


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    is_partner_user: Optional[bool] = None
    partner_id: Optional[int] = None


class PartnerInfo(BaseModel):
    """Minimal partner info for user response"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    code: str


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    w3id: Optional[str] = None
    is_active: bool
    full_name: str
    is_partner_user: bool = False
    partner_id: Optional[int] = None
    partner: Optional[PartnerInfo] = None
    created_at: datetime
    last_login: Optional[datetime] = None


class UserListResponse(BaseModel):
    items: List[UserResponse]
    total: int
    skip: int
    limit: int
