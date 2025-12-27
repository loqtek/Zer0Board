"""Dependencies for API routes."""

from typing import Optional
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status, Cookie, Query, Header, Request
from fastapi import Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.models.board import Board
from app.models.board_access_token import BoardAccessToken
from app.models.session import Session
from app.core.security import verify_password, hash_token, verify_token
import secrets


def create_session_token() -> str:
    """Create a new session token."""
    return secrets.token_urlsafe(32)


async def get_session_user_id(token: str, session: AsyncSession) -> Optional[int]:
    """Get user ID from session token (database-backed)."""
    result = await session.execute(
        select(Session).where(Session.token == token)
    )
    db_session = result.scalar_one_or_none()
    
    if not db_session:
        return None
    
    # Check if expired
    if db_session.is_expired():
        # Delete expired session
        await session.delete(db_session)
        await session.commit()
        return None
    
    return db_session.user_id


async def set_session(token: str, user_id: int, session: AsyncSession) -> None:
    """Set session data (database-backed)."""
    # Calculate expiration time
    expires_at = datetime.utcnow() + timedelta(minutes=settings.session_expire_minutes)
    
    # Check if session already exists
    result = await session.execute(
        select(Session).where(Session.token == token)
    )
    existing = result.scalar_one_or_none()
    
    if existing:
        # Update existing session
        existing.user_id = user_id
        existing.expires_at = expires_at
    else:
        # Create new session
        db_session = Session(
            token=token,
            user_id=user_id,
            expires_at=expires_at
        )
        session.add(db_session)
    
    await session.commit()


async def delete_session(token: str, session: AsyncSession) -> None:
    """Delete session (database-backed)."""
    result = await session.execute(
        select(Session).where(Session.token == token)
    )
    db_session = result.scalar_one_or_none()
    
    if db_session:
        await session.delete(db_session)
        await session.commit()


async def get_current_user(
    session: AsyncSession = Depends(get_db),
    session_token: Optional[str] = Cookie(None, alias=settings.session_cookie_name),
) -> User:
    """Dependency to get current authenticated user."""
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    user_id = await get_session_user_id(session_token, session)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session",
        )

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    return user


async def get_current_user_optional(
    session: AsyncSession = Depends(get_db),
    session_token: Optional[str] = Cookie(None, alias=settings.session_cookie_name),
) -> Optional[User]:
    """Dependency to get current user if authenticated, None otherwise."""
    try:
        return await get_current_user(session, session_token)
    except HTTPException:
        return None


async def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency to require admin user."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def get_board_from_api_key(
    request: Request,
    session: AsyncSession = Depends(get_db),
    access_token: Optional[str] = Query(None, alias="access_token"),
    authorization: Optional[str] = Header(None),
) -> Optional[Board]:
    """Get board from API key in query param or Authorization header.
    
    Supports:
    - Query param: ?access_token=abc123
    - Header: Authorization: Bearer abc123 or X-Access-Token: abc123
    """
    # Try to get token from query param first
    token = access_token
    
    # If not in query, try Authorization header (Bearer token)
    if not token and authorization:
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
    
    # If still not found, try X-Access-Token header
    if not token:
        token = request.headers.get("X-Access-Token")
    
    if not token:
        return None
    
    # Hash the token and look it up
    token_hash = hash_token(token)
    
    result = await session.execute(
        select(BoardAccessToken)
        .join(Board)
        .where(
            and_(
                BoardAccessToken.token_hash == token_hash,
                BoardAccessToken.is_active == True,
                (BoardAccessToken.expires_at.is_(None) | (BoardAccessToken.expires_at > datetime.utcnow()))
            )
        )
    )
    access_token_obj = result.scalar_one_or_none()
    
    if not access_token_obj:
        return None
    
    # Update last_used_at
    access_token_obj.last_used_at = datetime.utcnow()
    await session.commit()
    
    # Load the board with all relationships
    result = await session.execute(
        select(Board)
        .options(selectinload(Board.widgets), selectinload(Board.settings))
        .where(Board.id == access_token_obj.board_id)
    )
    board = result.scalar_one_or_none()
    
    return board


async def get_board_with_auth(
    board_id: int,
    request: Request,
    session: AsyncSession = Depends(get_db),
    current_user: Optional[User] = Depends(get_current_user_optional),
    access_token: Optional[str] = Query(None, alias="access_token"),
    authorization: Optional[str] = Header(None),
) -> Board:
    """Get board with authentication - supports both user auth and API key auth."""
    # Try API key authentication first
    board_from_key = await get_board_from_api_key(request, session, access_token, authorization)
    if board_from_key and board_from_key.id == board_id:
        return board_from_key
    
    # Fall back to user authentication
    if current_user:
        result = await session.execute(
            select(Board)
            .options(selectinload(Board.widgets), selectinload(Board.settings))
            .where(Board.id == board_id)
        )
        board = result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found",
            )
        
        # Check access: owner or admin
        if board.owner_id != current_user.id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this board",
            )
        
        return board
    
    # No authentication provided
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required",
    )

