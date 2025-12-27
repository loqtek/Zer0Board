"""Session model for database-backed session storage."""

from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, String, DateTime, Index
from sqlalchemy.orm import relationship

from app.core.database import Base
from app.core.config import settings


class Session(Base):
    """Session model for storing user sessions in the database."""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    
    # Index for efficient lookups
    __table_args__ = (
        Index("idx_session_token_user", "token", "user_id"),
    )

    def is_expired(self) -> bool:
        """Check if session is expired."""
        return datetime.utcnow() > self.expires_at

