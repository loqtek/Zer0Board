"""Board model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, UniqueConstraint
from sqlalchemy.orm import relationship

from app.core.database import Base


class Board(Base):
    """Board model for organizing widgets."""

    __tablename__ = "boards"
    __table_args__ = (
        UniqueConstraint('owner_id', 'title', name='uq_board_owner_title'),
    )

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    layout_config = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    owner = relationship("User", back_populates="boards")
    widgets = relationship("Widget", back_populates="board", cascade="all, delete-orphan")
    settings = relationship("BoardSettings", back_populates="board", cascade="all, delete-orphan", uselist=False)
    access_tokens = relationship("BoardAccessToken", back_populates="board", cascade="all, delete-orphan")

