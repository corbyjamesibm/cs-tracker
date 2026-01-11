"""Authentication API endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
import secrets
from urllib.parse import urlencode

from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, create_access_token
from app.core.auth import get_current_user, get_auth_enabled
from app.models.user import User
from app.models.settings import AppSetting
from app.schemas.auth import (
    LoginRequest, TokenResponse, AuthStatusResponse,
    AuthUserResponse, W3IDLoginResponse
)

router = APIRouter()


@router.get("/status", response_model=AuthStatusResponse)
async def get_auth_status(db: AsyncSession = Depends(get_db)):
    """Get authentication configuration status."""
    auth_enabled = await get_auth_enabled(db)

    # Check default method setting
    default_method_query = select(AppSetting).where(AppSetting.key == "auth_default_method")
    result = await db.execute(default_method_query)
    default_method_setting = result.scalar_one_or_none()
    default_method = default_method_setting.value if default_method_setting else "w3id"

    # W3ID is available if client credentials are configured
    w3id_available = bool(settings.w3id_client_id and settings.w3id_client_secret)

    return AuthStatusResponse(
        auth_enabled=auth_enabled,
        default_method=default_method,
        w3id_available=w3id_available,
        password_available=True
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    """Login with email and password."""
    # Find user by email
    query = select(User).where(User.email == login_data.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled"
        )

    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Password login not configured for this user. Please use W3ID."
        )

    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    await db.flush()

    # Create access token
    access_token = create_access_token(data={"sub": str(user.id)})

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.jwt_expire_minutes * 60,
        user=AuthUserResponse(
            id=user.id,
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            full_name=user.full_name,
            role=user.role,
            is_partner_user=user.is_partner_user
        )
    )


@router.get("/w3id/login", response_model=W3IDLoginResponse)
async def initiate_w3id_login():
    """Initiate W3ID OAuth login flow."""
    if not settings.w3id_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="W3ID authentication is not configured"
        )

    # Generate state for CSRF protection
    state = secrets.token_urlsafe(32)

    # Build authorization URL
    params = {
        "client_id": settings.w3id_client_id,
        "response_type": "code",
        "redirect_uri": settings.w3id_redirect_uri,
        "scope": "openid profile email",
        "state": state
    }

    auth_url = f"{settings.w3id_issuer_url}/authorize?{urlencode(params)}"

    return W3IDLoginResponse(auth_url=auth_url, state=state)


@router.get("/w3id/callback")
async def w3id_callback(
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db)
):
    """Handle W3ID OAuth callback."""
    if not settings.w3id_client_id or not settings.w3id_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="W3ID authentication is not configured"
        )

    # In a real implementation, we would:
    # 1. Exchange the code for tokens with W3ID
    # 2. Validate the tokens
    # 3. Extract user info from ID token
    # 4. Find or create user in database
    # 5. Generate our JWT

    # For now, return a placeholder response
    # This would be implemented when W3ID credentials are available
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="W3ID callback not fully implemented. Please configure W3ID credentials."
    )


@router.get("/me", response_model=AuthUserResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user)
):
    """Get current authenticated user info."""
    return AuthUserResponse(
        id=current_user.id,
        email=current_user.email,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        full_name=current_user.full_name,
        role=current_user.role,
        is_partner_user=current_user.is_partner_user
    )


@router.post("/logout")
async def logout():
    """Logout endpoint.

    Note: Since we use stateless JWT tokens, logout is handled client-side
    by removing the token. This endpoint exists for API completeness
    and could be extended to implement token blacklisting if needed.
    """
    return {"message": "Logged out successfully"}
