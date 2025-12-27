"""Board Access Token model for API key authentication."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Index
from sqlalchemy.orm import relationship

from app.core.database import Base


class BoardAccessToken(Base):
    """API key for accessing boards without full authentication."""

    __tablename__ = "board_access_tokens"
    __table_args__ = (
        Index('idx_token_hash', 'token_hash'),  # Index for fast lookups
    )

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, unique=True, index=True)  # Hashed token for security
    name = Column(String, nullable=True)  # Optional name/description for the token
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=True)  # Optional expiration
    last_used_at = Column(DateTime, nullable=True)  # Track last usage
    is_active = Column(Boolean, default=True, nullable=False)  # Allow revoking without deletion

    # Relationships
    board = relationship("Board", back_populates="access_tokens")



