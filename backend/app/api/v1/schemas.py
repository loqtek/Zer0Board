"""Pydantic schemas for API requests and responses."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr


# User Schemas
class UserBase(BaseModel):
    """Base user schema."""

    username: str
    email: Optional[EmailStr] = None


class UserCreate(UserBase):
    """Schema for creating a user."""

    password: str


class UserResponse(UserBase):
    """Schema for user response."""

    id: int
    is_admin: bool
    created_at: datetime
    last_login_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# Auth Schemas
class LoginRequest(BaseModel):
    """Schema for login request."""

    username: str
    password: str


class LoginResponse(BaseModel):
    """Schema for login response."""

    user: UserResponse
    message: str = "Login successful"


class ChangePasswordRequest(BaseModel):
    """Schema for changing password."""

    current_password: str
    new_password: str


class ChangePasswordResponse(BaseModel):
    """Schema for change password response."""

    message: str = "Password changed successfully"


class UpdateUserRequest(BaseModel):
    """Schema for updating user profile."""

    username: Optional[str] = None
    email: Optional[EmailStr] = None


# Board Schemas
class BoardBase(BaseModel):
    """Base board schema."""

    title: str
    description: Optional[str] = None


class BoardCreate(BoardBase):
    """Schema for creating a board."""

    layout_config: Optional[dict] = None


class BoardUpdate(BaseModel):
    """Schema for updating a board."""

    title: Optional[str] = None
    description: Optional[str] = None
    layout_config: Optional[dict] = None


class BoardSettingsBase(BaseModel):
    """Base board settings schema."""

    background_type: Optional[str] = None  # youtube, google_photos, dropbox, url, none, preset
    background_source: Optional[str] = None
    background_config: Optional[dict] = None
    background_preset: Optional[str] = None  # Preset ID from backgroundPresets
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    aspect_ratio: Optional[str] = None  # 16:9, 4:3, 21:9, custom, etc.
    orientation: Optional[str] = None  # landscape, portrait, auto
    auto_rotate_pages: Optional[bool] = None  # Enable automatic page rotation
    lockout_mode: Optional[bool] = None  # Enable lockout mode - prevents all interactions and navigation


class BoardSettingsUpdate(BoardSettingsBase):
    """Schema for updating board settings."""

    pass


class BoardSettingsResponse(BoardSettingsBase):
    """Schema for board settings response."""

    id: int
    board_id: int
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_orm(cls, obj):
        """Convert ORM object to response, handling boolean conversion."""
        data = {
            "id": obj.id,
            "board_id": obj.board_id,
            "background_type": obj.background_type,
            "background_source": obj.background_source,
            "background_config": obj.background_config or {},
            "resolution_width": obj.resolution_width,
            "resolution_height": obj.resolution_height,
            "aspect_ratio": obj.aspect_ratio,
            "orientation": obj.orientation,
            "auto_rotate_pages": bool(obj.auto_rotate_pages) if obj.auto_rotate_pages is not None else None,
            "lockout_mode": bool(obj.lockout_mode) if obj.lockout_mode is not None else None,
            "created_at": obj.created_at.isoformat() if hasattr(obj.created_at, "isoformat") else str(obj.created_at),
            "updated_at": obj.updated_at.isoformat() if hasattr(obj.updated_at, "isoformat") else str(obj.updated_at),
        }
        return cls(**data)

    class Config:
        from_attributes = True


class BoardResponse(BoardBase):
    """Schema for board response."""

    id: int
    owner_id: int
    layout_config: Optional[dict] = None
    settings: Optional[BoardSettingsResponse] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Widget Schemas
class WidgetBase(BaseModel):
    """Base widget schema."""

    type: str
    config: Optional[dict] = None
    position: Optional[dict] = None


class WidgetCreate(WidgetBase):
    """Schema for creating a widget."""

    pass


class WidgetUpdate(BaseModel):
    """Schema for updating a widget."""

    type: Optional[str] = None
    config: Optional[dict] = None
    position: Optional[dict] = None


class WidgetResponse(WidgetBase):
    """Schema for widget response."""

    id: int
    board_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Board with Widgets
class BoardDetailResponse(BoardResponse):
    """Schema for board with widgets."""

    widgets: list[WidgetResponse] = []

    class Config:
        from_attributes = True


# Board Access Token Schemas
class BoardAccessTokenCreate(BaseModel):
    """Schema for creating a board access token."""

    name: Optional[str] = None
    expires_at: Optional[datetime] = None


class BoardAccessTokenResponse(BaseModel):
    """Schema for board access token response."""

    id: int
    board_id: int
    name: Optional[str] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_used_at: Optional[datetime] = None
    is_active: bool

    class Config:
        from_attributes = True


class BoardAccessTokenCreateResponse(BaseModel):
    """Schema for board access token creation response (includes the token)."""

    id: int
    board_id: int
    name: Optional[str] = None
    token: str  # Only shown once when created
    created_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool


class BoardAccessTokenUpdate(BaseModel):
    """Schema for updating a board access token."""

    name: Optional[str] = None
    is_active: Optional[bool] = None
    expires_at: Optional[datetime] = None


# Error Schemas
class ErrorResponse(BaseModel):
    """Schema for error responses."""

    detail: str
    code: Optional[str] = None

