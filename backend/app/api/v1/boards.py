"""Board endpoints."""

import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.user import User
from app.models.board import Board
from app.models.widget import Widget
from app.models.board_settings import BoardSettings
from app.api.v1.schemas import (
    BoardCreate,
    BoardUpdate,
    BoardResponse,
    BoardDetailResponse,
    BoardSettingsUpdate,
    BoardSettingsResponse,
    WidgetCreate,
    WidgetUpdate,
    WidgetResponse,
    ErrorResponse,
)
from app.api.v1.dependencies import get_current_user, require_admin, get_board_with_auth

router = APIRouter()
logger = logging.getLogger("app.api.boards")


@router.get(
    "",
    response_model=list[BoardResponse],
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
    },
)
@router.get(
    "/",
    response_model=list[BoardResponse],
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
    },
)
async def list_boards(
    request: Request,
    skip: int = Query(0, ge=0, description="Number of boards to skip"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of boards to return"),
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """List boards accessible to the current user."""
    logger.debug(f"Listing boards for user '{current_user.username}' (ID: {current_user.id}) - skip={skip}, limit={limit}")
    
    # Users can see their own boards and admins can see all boards
    if current_user.is_admin:
        # Admin can see all boards
        result = await session.execute(
            select(Board)
            .options(selectinload(Board.settings))
            .order_by(Board.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        logger.debug("Admin user - fetching all boards")
    else:
        # Regular users only see their own boards
        result = await session.execute(
            select(Board)
            .options(selectinload(Board.settings))
            .where(Board.owner_id == current_user.id)
            .order_by(Board.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        logger.debug(f"Regular user - fetching boards for owner_id={current_user.id}")

    boards = result.scalars().all()
    logger.info(f"Returning {len(boards)} board(s) for user '{current_user.username}'")
    return [BoardResponse.model_validate(board) for board in boards]


@router.get(
    "/{board_id}",
    response_model=BoardDetailResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def get_board(
    board_id: int,
    request: Request,
    board: Board = Depends(get_board_with_auth),
):
    """Get a board with its widgets.
    
    Supports authentication via:
    - Session cookie (user authentication)
    - API key in query param: ?access_token=abc123
    - API key in header: Authorization: Bearer abc123 or X-Access-Token: abc123
    """
    logger.debug(f"Getting board ID {board_id}")
    
    logger.info(f"Board ID {board_id} retrieved successfully - {len(board.widgets)} widget(s)")
    return BoardDetailResponse.model_validate(board)


@router.post(
    "",
    response_model=BoardResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
    },
)
async def create_board(
    board_data: BoardCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a new board."""
    logger.info(f"Creating board '{board_data.title}' for user '{current_user.username}' (ID: {current_user.id})")
    
    # Check if board with same title already exists for this user
    existing_board = await session.execute(
        select(Board).where(
            and_(Board.owner_id == current_user.id, Board.title == board_data.title)
        )
    )
    if existing_board.scalar_one_or_none():
        logger.warning(f"Board creation failed: Duplicate title '{board_data.title}' for user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A board with the title '{board_data.title}' already exists",
        )

    board = Board(
        owner_id=current_user.id,
        title=board_data.title,
        description=board_data.description,
        layout_config=board_data.layout_config or {},
    )

    try:
        session.add(board)
        await session.commit()
        await session.refresh(board)
        logger.info(f"Board created successfully: ID {board.id}, title '{board.title}' for user '{current_user.username}' (ID: {current_user.id})")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error creating board '{board_data.title}' for user '{current_user.username}': {e}", exc_info=True)
        # Check if it's a unique constraint violation
        if "uq_board_owner_title" in str(e) or "UNIQUE constraint" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A board with the title '{board_data.title}' already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create board",
        )

    # Reload board with settings relationship for serialization
    result = await session.execute(
        select(Board)
        .options(selectinload(Board.settings))
        .where(Board.id == board.id)
    )
    board_with_settings = result.scalar_one()
    return BoardResponse.model_validate(board_with_settings)


@router.put(
    "/{board_id}",
    response_model=BoardResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def update_board(
    board_id: int,
    board_data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update a board (owner or admin only)."""
    logger.info(f"Updating board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Board update failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Board update denied: User '{current_user.username}' (ID: {current_user.id}) attempted to update board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to edit this board",
        )

    # Check if updating title would create a duplicate
    if board_data.title is not None and board_data.title != board.title:
        existing_board = await session.execute(
            select(Board).where(
                and_(
                    Board.owner_id == current_user.id,
                    Board.title == board_data.title,
                    Board.id != board_id,
                )
            )
        )
        if existing_board.scalar_one_or_none():
            logger.warning(f"Board update failed: Duplicate title '{board_data.title}' for user '{current_user.username}' (ID: {current_user.id})")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A board with the title '{board_data.title}' already exists",
            )

    # Update fields
    changes = []
    if board_data.title is not None and board_data.title != board.title:
        changes.append(f"title: '{board.title}' -> '{board_data.title}'")
        board.title = board_data.title
    if board_data.description is not None and board_data.description != board.description:
        changes.append("description updated")
        board.description = board_data.description
    if board_data.layout_config is not None:
        changes.append("layout_config updated")
        board.layout_config = board_data.layout_config

    if not changes:
        logger.debug(f"No changes detected for board ID {board_id}")
        # Reload board with settings relationship for serialization
        result = await session.execute(
            select(Board)
            .options(selectinload(Board.settings))
            .where(Board.id == board_id)
        )
        board_with_settings = result.scalar_one()
        return BoardResponse.model_validate(board_with_settings)

    try:
        await session.commit()
        await session.refresh(board)
        logger.info(f"Board ID {board_id} updated successfully by user '{current_user.username}' - Changes: {', '.join(changes)}")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error updating board ID {board_id}: {e}", exc_info=True)
        # Check if it's a unique constraint violation
        if "uq_board_owner_title" in str(e) or "UNIQUE constraint" in str(e):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"A board with the title '{board_data.title}' already exists",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update board",
        )

    # Reload board with settings relationship for serialization
    result = await session.execute(
        select(Board)
        .options(selectinload(Board.settings))
        .where(Board.id == board_id)
    )
    board_with_settings = result.scalar_one()
    return BoardResponse.model_validate(board_with_settings)


@router.delete(
    "/{board_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def delete_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Delete a board (owner or admin only)."""
    logger.info(f"Deleting board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Board deletion failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Board deletion denied: User '{current_user.username}' (ID: {current_user.id}) attempted to delete board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete this board",
        )

    board_title = board.title
    await session.delete(board)
    await session.commit()

    logger.info(f"Board ID {board_id} ('{board_title}') deleted successfully by user '{current_user.username}' (ID: {current_user.id})")
    return None


# Widget endpoints

@router.post(
    "/{board_id}/widgets",
    response_model=WidgetResponse,
    status_code=status.HTTP_201_CREATED,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def create_widget(
    board_id: int,
    widget_data: WidgetCreate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Create a widget on a board."""
    logger.info(f"Creating widget type '{widget_data.type}' on board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    # Check board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Widget creation failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Widget creation denied: User '{current_user.username}' (ID: {current_user.id}) attempted to add widget to board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to add widgets to this board",
        )

    # Validate widget type
    valid_types = [
        "clock", "weather", "news", "calendar", "note",
        "google_calendar", "microsoft_calendar",
        "stock", "tradingview", "crypto",
        "graph", "metric",
        "email", "slack", "discord", "teams",
        "todo",
        "photo",
        "fitbit",
        "smart_home", "home_assistant",
        "qr_code",
        "bookmark",
    ]
    if widget_data.type not in valid_types:
        logger.warning(f"Widget creation failed: Invalid widget type '{widget_data.type}' for board ID {board_id} by user '{current_user.username}'")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid widget type. Must be one of: {', '.join(valid_types)}",
        )

    widget = Widget(
        board_id=board_id,
        type=widget_data.type,
        config=widget_data.config or {},
        position=widget_data.position or {},
    )

    try:
        session.add(widget)
        await session.commit()
        await session.refresh(widget)
        logger.info(f"Widget ID {widget.id} (type: '{widget.type}') created successfully on board ID {board_id} by user '{current_user.username}'")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error creating widget on board ID {board_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create widget",
        )

    return WidgetResponse.model_validate(widget)


@router.put(
    "/{board_id}/widgets/{widget_id}",
    response_model=WidgetResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def update_widget(
    board_id: int,
    widget_id: int,
    widget_data: WidgetUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update a widget."""
    # Check board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to edit widgets on this board",
        )

    # Get widget
    widget_result = await session.execute(
        select(Widget).where(
            and_(Widget.id == widget_id, Widget.board_id == board_id)
        )
    )
    widget = widget_result.scalar_one_or_none()

    if not widget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Widget not found",
        )

    # Update fields
    if widget_data.type is not None:
        # Validate widget type (same as create_widget)
        valid_types = [
            "clock", "weather", "news", "calendar", "note",
            "google_calendar", "microsoft_calendar",
            "stock", "tradingview", "crypto",
            "graph", "metric",
            "email", "slack", "discord", "teams",
            "todo",
            "photo",
            "fitbit",
            "smart_home", "home_assistant",
            "qr_code",
            "bookmark",
        ]
        if widget_data.type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid widget type. Must be one of: {', '.join(valid_types)}",
            )
        widget.type = widget_data.type
    if widget_data.config is not None:
        widget.config = widget_data.config
    if widget_data.position is not None:
        widget.position = widget_data.position

    try:
        await session.commit()
        await session.refresh(widget)
    except Exception as e:
        await session.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update widget",
        )

    return WidgetResponse.model_validate(widget)


@router.delete(
    "/{board_id}/widgets/{widget_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def delete_widget(
    board_id: int,
    widget_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Delete a widget."""
    logger.info(f"Deleting widget ID {widget_id} from board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    # Check board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Widget deletion failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Widget deletion denied: User '{current_user.username}' (ID: {current_user.id}) attempted to delete widget from board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to delete widgets from this board",
        )

    # Get widget
    widget_result = await session.execute(
        select(Widget).where(
            and_(Widget.id == widget_id, Widget.board_id == board_id)
        )
    )
    widget = widget_result.scalar_one_or_none()

    if not widget:
        logger.warning(f"Widget deletion failed: Widget ID {widget_id} not found on board ID {board_id} - requested by user '{current_user.username}'")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Widget not found",
        )

    widget_type = widget.type
    await session.delete(widget)
    await session.commit()

    logger.info(f"Widget ID {widget_id} (type: '{widget_type}') deleted successfully from board ID {board_id} by user '{current_user.username}'")
    return None


# Board Settings endpoints

@router.get(
    "/{board_id}/settings",
    response_model=BoardSettingsResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def get_board_settings(
    board_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Get board settings."""
    logger.debug(f"Getting settings for board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    # Check board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Board settings request failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Board settings access denied: User '{current_user.username}' (ID: {current_user.id}) attempted to access settings for board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to access this board's settings",
        )

    # Get or create settings
    settings_result = await session.execute(
        select(BoardSettings).where(BoardSettings.board_id == board_id)
    )
    settings = settings_result.scalar_one_or_none()

    if not settings:
        # Create default settings if they don't exist
        settings = BoardSettings(board_id=board_id)
        session.add(settings)
        await session.commit()
        await session.refresh(settings)
        logger.info(f"Created default settings for board ID {board_id}")

    logger.info(f"Board settings retrieved for board ID {board_id} by user '{current_user.username}'")
    return BoardSettingsResponse.from_orm(settings)


@router.put(
    "/{board_id}/settings",
    response_model=BoardSettingsResponse,
    status_code=status.HTTP_200_OK,
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        404: {"model": ErrorResponse},
    },
)
async def update_board_settings(
    board_id: int,
    settings_data: BoardSettingsUpdate,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """Update board settings."""
    logger.info(f"Updating settings for board ID {board_id} by user '{current_user.username}' (ID: {current_user.id})")
    
    # Check board exists and user has access
    result = await session.execute(
        select(Board).where(Board.id == board_id)
    )
    board = result.scalar_one_or_none()

    if not board:
        logger.warning(f"Board settings update failed: Board ID {board_id} not found - requested by user '{current_user.username}' (ID: {current_user.id})")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Board not found",
        )

    # Check ownership or admin
    if board.owner_id != current_user.id and not current_user.is_admin:
        logger.warning(f"Board settings update denied: User '{current_user.username}' (ID: {current_user.id}) attempted to update settings for board ID {board_id} (owner_id: {board.owner_id})")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to update this board's settings",
        )

    # Get or create settings
    settings_result = await session.execute(
        select(BoardSettings).where(BoardSettings.board_id == board_id)
    )
    settings = settings_result.scalar_one_or_none()

    if not settings:
        # Create new settings
        settings = BoardSettings(board_id=board_id)
        session.add(settings)

    # Update fields
    if settings_data.background_type is not None:
        settings.background_type = settings_data.background_type
    if settings_data.background_source is not None:
        settings.background_source = settings_data.background_source
    if settings_data.background_config is not None:
        settings.background_config = settings_data.background_config
    if settings_data.resolution_width is not None:
        settings.resolution_width = settings_data.resolution_width
    if settings_data.resolution_height is not None:
        settings.resolution_height = settings_data.resolution_height
    if settings_data.aspect_ratio is not None:
        settings.aspect_ratio = settings_data.aspect_ratio
    if settings_data.orientation is not None:
        settings.orientation = settings_data.orientation
    if settings_data.auto_rotate_pages is not None:
        settings.auto_rotate_pages = 1 if settings_data.auto_rotate_pages else 0
    if settings_data.lockout_mode is not None:
        settings.lockout_mode = 1 if settings_data.lockout_mode else 0

    try:
        await session.commit()
        await session.refresh(settings)
        logger.info(f"Board settings updated successfully for board ID {board_id} by user '{current_user.username}'")
    except Exception as e:
        await session.rollback()
        logger.error(f"Error updating board settings for board ID {board_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update board settings",
        )

    return BoardSettingsResponse.from_orm(settings)

