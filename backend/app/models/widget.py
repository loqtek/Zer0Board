"""Widget model."""

from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship

from app.core.database import Base


class Widget(Base):
    """Widget model for board components."""

    __tablename__ = "widgets"

    id = Column(Integer, primary_key=True, index=True)
    board_id = Column(Integer, ForeignKey("boards.id"), nullable=False, index=True)
    type = Column(String, nullable=False)  # clock, weather, news
    config = Column(JSON, nullable=True, default=dict)
    position = Column(JSON, nullable=True, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    board = relationship("Board", back_populates="widgets")

