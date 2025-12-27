"""Board access token endpoints for API key management."""

import logging
import secrets
from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.user import User
from app.models.board import Board
from app.models.board_access_token import BoardAccessToken
from app.api.v1.schemas import (
    BoardAccessTokenCreate,
    BoardAccessTokenResponse,
    BoardAccessTokenCreateResponse,
    BoardAccessTokenUpdate,
    ErrorResponse,
)
from app.api.v1.dependencies import get_current_user
from app.core.security import hash_token

router = APIRouter()
logger = logging.getLogger("app.api.board_access_tokens")


@router.post(
    "/boards/{board_id}/access-tokens",
    response_model=BoardAccessTokenCreateResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def create_access_token(
    board_id: int,
    token_data: BoardAccessTokenCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a new access token for a board."""
    logger.debug(f"Creating access token for board ID {board_id} by user '{current_user.username}'")
    
    # Verify board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
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
            detail="You don't have permission to create access tokens for this board",
        )
    
    # Generate secure token
    token = secrets.token_urlsafe(32)
    token_hash = hash_token(token)
    
    # Create access token
    access_token = BoardAccessToken(
        board_id=board_id,
        token_hash=token_hash,
        name=token_data.name,
        expires_at=token_data.expires_at,
        is_active=True,
    )
    
    session.add(access_token)
    await session.commit()
    await session.refresh(access_token)
    
    logger.info(f"Created access token ID {access_token.id} for board ID {board_id}")
    
    return BoardAccessTokenCreateResponse(
        id=access_token.id,
        board_id=access_token.board_id,
        name=access_token.name,
        token=token,  # Return the plain token only once
        created_at=access_token.created_at,
        expires_at=access_token.expires_at,
        is_active=access_token.is_active,
    )


@router.get(
    "/boards/{board_id}/access-tokens",
    response_model=list[BoardAccessTokenResponse],
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def list_access_tokens(
    board_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """List all access tokens for a board."""
    logger.debug(f"Listing access tokens for board ID {board_id} by user '{current_user.username}'")
    
    # Verify board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
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
            detail="You don't have permission to view access tokens for this board",
        )
    
    # Get all access tokens for this board
    result = await session.execute(
        select(BoardAccessToken)
        .where(BoardAccessToken.board_id == board_id)
        .order_by(BoardAccessToken.created_at.desc())
    )
    tokens = result.scalars().all()
    
    logger.info(f"Returning {len(tokens)} access token(s) for board ID {board_id}")
    return [BoardAccessTokenResponse.model_validate(token) for token in tokens]


@router.patch(
    "/boards/{board_id}/access-tokens/{token_id}",
    response_model=BoardAccessTokenResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def update_access_token(
    board_id: int,
    token_id: int,
    token_data: BoardAccessTokenUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update an access token (name, active status, expiration)."""
    logger.debug(f"Updating access token ID {token_id} for board ID {board_id} by user '{current_user.username}'")
    
    # Verify board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
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
            detail="You don't have permission to update access tokens for this board",
        )
    
    # Get the token
    result = await session.execute(
        select(BoardAccessToken)
        .where(
            BoardAccessToken.id == token_id,
            BoardAccessToken.board_id == board_id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access token not found",
        )
    
    # Update fields
    if token_data.name is not None:
        token.name = token_data.name
    if token_data.is_active is not None:
        token.is_active = token_data.is_active
    if token_data.expires_at is not None:
        token.expires_at = token_data.expires_at
    
    await session.commit()
    await session.refresh(token)
    
    logger.info(f"Updated access token ID {token_id} for board ID {board_id}")
    return BoardAccessTokenResponse.model_validate(token)


@router.delete(
    "/boards/{board_id}/access-tokens/{token_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def delete_access_token(
    board_id: int,
    token_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Delete an access token."""
    logger.debug(f"Deleting access token ID {token_id} for board ID {board_id} by user '{current_user.username}'")
    
    # Verify board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
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
            detail="You don't have permission to delete access tokens for this board",
        )
    
    # Get the token
    result = await session.execute(
        select(BoardAccessToken)
        .where(
            BoardAccessToken.id == token_id,
            BoardAccessToken.board_id == board_id
        )
    )
    token = result.scalar_one_or_none()
    
    if not token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Access token not found",
        )
    
    await session.delete(token)
    await session.commit()
    
    logger.info(f"Deleted access token ID {token_id} for board ID {board_id}")
    return None



