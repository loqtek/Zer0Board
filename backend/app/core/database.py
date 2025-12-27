"""Database configuration and session management."""

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base

from app.core.config import settings

# Base class for models
Base = declarative_base()

# Create async engine based on database type
if settings.database_type.lower() == "sqlite":
    # SQLite with aiosqlite
    engine = create_async_engine(
        settings.database_url,
        echo=False, # keep false on all, annoying ass shit logs
        future=True,
    )
    # For schema creation, we need a sync engine
    # Convert async URL to sync URL for SQLite
    sync_url = settings.database_url.replace("sqlite+aiosqlite:///", "sqlite:///")
    sync_engine = create_engine(sync_url, echo=False, connect_args={"check_same_thread": False})
elif settings.database_type.lower() == "postgresql":
    # PostgreSQL with asyncpg
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
    )
    # For schema creation, use psycopg2 (sync)
    # Convert postgresql+asyncpg:// to postgresql+psycopg2://
    sync_url = settings.database_url.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
    sync_engine = create_engine(sync_url, echo=False, pool_pre_ping=True)
elif settings.database_type.lower() == "mysql":
    # MySQL with aiomysql
    # Note: DATABASE_URL should use mysql+aiomysql:// format
    engine = create_async_engine(
        settings.database_url,
        echo=False,
        future=True,
        pool_pre_ping=True,
    )
    # For schema creation, use pymysql (sync)
    sync_url = settings.database_url.replace("mysql+aiomysql://", "mysql+pymysql://")
    sync_engine = create_engine(sync_url, echo=False, pool_pre_ping=True)
else:
    raise ValueError(f"Unsupported database type: {settings.database_type}")

# Create async session factory
AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


def init_database_schema() -> None:
    """Initialize database schema by creating all tables.
    
    This is idempotent - safe to run multiple times.
    Tables are only created if they don't already exist.
    """
    # Import all models to ensure they're registered with Base
    from app.models.user import User
    from app.models.board import Board
    from app.models.widget import Widget
    from app.models.integration import Integration
    from app.models.board_settings import BoardSettings
    from app.models.board_access_token import BoardAccessToken
    from app.models.session import Session
    
    # Create all tables
    Base.metadata.create_all(bind=sync_engine)


async def get_db() -> AsyncSession:
    """Dependency to get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

