"""Authentication schemas."""
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.models.user import UserRole


class LoginRequest(BaseModel):
    """Email/password login request."""
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: "AuthUserResponse"


class AuthUserResponse(BaseModel):
    """User info returned with auth responses."""
    id: int
    email: str
    first_name: str
    last_name: str
    full_name: str
    role: UserRole
    is_partner_user: bool = False

    class Config:
        from_attributes = True


class AuthStatusResponse(BaseModel):
    """Authentication configuration status."""
    auth_enabled: bool
    default_method: str = "w3id"
    w3id_available: bool = False
    password_available: bool = True


class W3IDLoginResponse(BaseModel):
    """Response for W3ID login initiation."""
    auth_url: str
    state: str


# Resolve forward reference
TokenResponse.model_rebuild()
