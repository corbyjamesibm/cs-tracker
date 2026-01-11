"""Authentication dependencies for FastAPI."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User
from app.models.settings import AppSetting

# HTTP Bearer token security scheme (optional for when auth is disabled)
security = HTTPBearer(auto_error=False)


async def get_auth_enabled(db: AsyncSession = Depends(get_db)) -> bool:
    """Check if authentication is enabled from database settings."""
    query = select(AppSetting).where(AppSetting.key == "auth_enabled")
    result = await db.execute(query)
    setting = result.scalar_one_or_none()

    if setting is None:
        # Default to disabled if setting doesn't exist
        return False

    return setting.get_typed_value()


async def get_default_user(db: AsyncSession) -> Optional[User]:
    """Get the first active user as the default when auth is disabled."""
    query = select(User).where(User.is_active == True).order_by(User.id).limit(1)
    result = await db.execute(query)
    return result.scalar_one_or_none()


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    Get the current authenticated user.
    If auth is disabled, returns the default user.
    If auth is enabled, validates the JWT token and returns the user.
    """
    auth_enabled = await get_auth_enabled(db)

    if not auth_enabled:
        # Auth disabled - return default user
        user = await get_default_user(db)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="No default user found. Please create at least one user."
            )
        return user

    # Auth enabled - validate token
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = decode_token(credentials.credentials)
    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = token_data.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db.get(User, int(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> Optional[User]:
    """
    Get the current user if authenticated, or None.
    Useful for endpoints that work both with and without auth.
    """
    auth_enabled = await get_auth_enabled(db)

    if not auth_enabled:
        return await get_default_user(db)

    if not credentials:
        return None

    token_data = decode_token(credentials.credentials)
    if not token_data:
        return None

    user_id = token_data.get("sub")
    if not user_id:
        return None

    user = await db.get(User, int(user_id))
    if not user or not user.is_active:
        return None

    return user


async def require_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Require the current user to be an admin."""
    from app.models.user import UserRole

    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user
