"""Authentication endpoints."""

import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response, Cookie, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.config import settings
from app.core.security import verify_password, get_password_hash
from app.models.user import User
from app.api.v1.schemas import (
    LoginRequest,
    LoginResponse,
    UserResponse,
    ChangePasswordRequest,
    ChangePasswordResponse,
    UpdateUserRequest,
    ErrorResponse,
)
from app.api.v1.dependencies import (
    get_current_user,
    create_session_token,
    set_session,
    delete_session,
)

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger("app.api.auth")


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
    },
)
@limiter.limit(f"{settings.login_rate_limit_per_minute}/minute")
async def login(
    request: Request,
    login_data: LoginRequest,
    response: Response,
    session: AsyncSession = Depends(get_db),
):
    """Login endpoint - authenticates user and sets session cookie."""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"Login attempt for username: {login_data.username} from IP: {client_ip}")
    
    # Find user by username
    result = await session.execute(
        select(User).where(User.username == login_data.username)
    )
    user = result.scalar_one_or_none()

    if not user:
        logger.warning(f"Login failed: User '{login_data.username}' not found from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Verify password
    if not verify_password(login_data.password, user.password_hash):
        logger.warning(f"Login failed: Invalid password for user '{login_data.username}' from IP: {client_ip}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    # Update last login
    user.last_login_at = datetime.utcnow()
    await session.commit()

    # Create session
    session_token = create_session_token()
    await set_session(session_token, user.id, session)

    # Set HTTPOnly cookie
    # For cross-origin requests (different ports), we need sameSite="none" with secure=True
    # Modern browsers allow secure=True on localhost even over HTTP
    samesite_value = settings.session_cookie_samesite.lower()
    secure_value = settings.session_cookie_secure
    
    if settings.is_development:
        # In development, if we need cross-origin cookies, use "none" with secure=True
        # This works on localhost even over HTTP in modern browsers
        if samesite_value in ("strict", "lax"):
            samesite_value = "none"
            secure_value = True  # Required for sameSite=none
    
    response.set_cookie(
        key=settings.session_cookie_name,
        value=session_token,
        httponly=settings.session_cookie_httponly,
        secure=secure_value,
        samesite=samesite_value,
        max_age=settings.session_expire_minutes * 60,
        path="/",
    )

    logger.info(f"Login successful for user '{user.username}' (ID: {user.id}, Admin: {user.is_admin}) from IP: {client_ip}")
    return LoginResponse(
        user=UserResponse.model_validate(user),
        message="Login successful",
    )


@router.post(
    "/logout",
    response_model=dict,
    status_code=status.HTTP_200_OK,
)
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    session_token: str = Cookie(None, alias=settings.session_cookie_name),
    session: AsyncSession = Depends(get_db),
):
    """Logout endpoint - invalidates session."""
    client_ip = request.client.host if request.client else "unknown"
    logger.info(f"Logout for user '{current_user.username}' (ID: {current_user.id}) from IP: {client_ip}")
    
    # Delete session (if token provided)
    if session_token:
        await delete_session(session_token, session)
        logger.debug(f"Session token deleted for user ID: {current_user.id}")

    # Clear cookie
    # Use same samesite logic as login
    samesite_value = settings.session_cookie_samesite.lower()
    if settings.is_development and samesite_value == "strict":
        samesite_value = "lax"
    
    response.delete_cookie(
        key=settings.session_cookie_name,
        httponly=settings.session_cookie_httponly,
        secure=settings.session_cookie_secure,
        samesite=samesite_value,
        path="/",
    )

    logger.info(f"Logout successful for user '{current_user.username}' from IP: {client_ip}")
    return {"message": "Logout successful"}


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
    },
)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
):
    """Get current user information."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/change-password",
    response_model=ChangePasswordResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
)
async def change_password(
    request: ChangePasswordRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Change password for authenticated user."""
    logger.info(f"Password change attempt for user '{current_user.username}' (ID: {current_user.id})")
    
    # Verify current password
    if not verify_password(request.current_password, current_user.password_hash):
        logger.warning(f"Password change failed: Incorrect current password for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    # Validate new password (basic validation)
    if len(request.new_password) < 8:
        logger.warning(f"Password change failed: New password too short for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be at least 8 characters long",
        )

    # Update password
    current_user.password_hash = get_password_hash(request.new_password)
    await session.commit()

    logger.info(f"Password changed successfully for user '{current_user.username}' (ID: {current_user.id})")
    return ChangePasswordResponse(message="Password changed successfully")


@router.put(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    responses={
        400: {"model": ErrorResponse},
        401: {"model": ErrorResponse},
    },
)
async def update_profile(
    request: UpdateUserRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update profile information for authenticated user."""
    logger.info(f"Profile update attempt for user '{current_user.username}' (ID: {current_user.id})")
    
    # Check if username is being changed and if it's already taken
    if request.username and request.username != current_user.username:
        result = await session.execute(
            select(User).where(User.username == request.username)
        )
        existing_user = result.scalar_one_or_none()
        if existing_user:
            logger.warning(f"Profile update failed: Username '{request.username}' already taken")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username is already taken",
            )
        current_user.username = request.username
        logger.info(f"Username updated to '{request.username}' for user ID: {current_user.id}")
    
    # Update email if provided
    if request.email is not None:
        current_user.email = request.email
        logger.info(f"Email updated for user '{current_user.username}' (ID: {current_user.id})")
    
    await session.commit()
    await session.refresh(current_user)
    
    logger.info(f"Profile updated successfully for user '{current_user.username}' (ID: {current_user.id})")
    return UserResponse.model_validate(current_user)

