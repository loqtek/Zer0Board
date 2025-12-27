#!/usr/bin/env python3
"""Startup script to run migrations and setup."""

import asyncio
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from alembic.config import Config
from alembic import command
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import engine, AsyncSessionLocal
from app.core.setup import setup_database
from app.models import user, board, widget  # noqa: F401


async def run_setup() -> None:
    """Run database setup."""
    # Run migrations
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

    # For async migrations, we need to use the async engine
    # Alembic will handle this through env.py
    command.upgrade(alembic_cfg, "head")

    # Run setup (create admin user if needed)
    async with AsyncSessionLocal() as session:
        await setup_database(session)
        await session.commit()


if __name__ == "__main__":
    asyncio.run(run_setup())

