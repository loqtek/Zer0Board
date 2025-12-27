"""Integration model for external service connections."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Integration(Base):
    """Integration model for external service connections (OAuth, API keys, etc.)."""

    __tablename__ = "integrations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    service = Column(String, nullable=False)  # google_calendar, microsoft_calendar, slack, etc.
    service_type = Column(String, nullable=False)  # oauth, api_key, webhook
    config = Column(JSON, nullable=True, default=dict)  # OAuth tokens, API keys, etc.
    extra_data = Column(JSON, nullable=True, default=dict)  # Additional metadata (renamed from metadata to avoid SQLAlchemy conflict)
    is_active = Column(String, default="true")  # Store as string for SQLite compatibility (use Boolean for PostgreSQL)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="integrations")

