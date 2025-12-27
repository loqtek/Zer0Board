"""Board settings model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class BoardSettings(Base):
    """Board settings model for display configuration."""

    __tablename__ = "board_settings"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False, unique=True, index=True)
    
    # Background settings
    background_type = Column(String, nullable=True)  # youtube, google_photos, dropbox, url, none, preset
    background_source = Column(String, nullable=True)  # URL, video ID, photo ID, etc.
    background_config = Column(JSON, nullable=True, default=dict)  # Additional config (autoplay, loop, etc.)
    background_preset = Column(String, nullable=True)  # Preset ID from backgroundPresets
    
    # Display settings
    resolution_width = Column(Integer, nullable=True)  # e.g., 1920
    resolution_height = Column(Integer, nullable=True)  # e.g., 1080
    aspect_ratio = Column(String, nullable=True)  # 16:9, 4:3, 21:9, custom, etc.
    orientation = Column(String, nullable=True)  # landscape, portrait, auto
    auto_rotate_pages = Column(Integer, nullable=True, default=0)  # 0 = disabled, 1 = enabled (using Integer for SQLite compatibility)
    lockout_mode = Column(Integer, nullable=True, default=0)  # 0 = disabled, 1 = enabled - Prevents all interactions and navigation
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    board = relationship("Board", back_populates="settings", uselist=False)


