#!/usr/bin/env python3
"""Reset admin password utility script."""

import asyncio
import logging
import secrets
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash

# Setup logging
setup_logging()
logger = logging.getLogger("app.scripts.reset_admin_password")


async def reset_admin_password() -> None:
    """Reset the admin user password."""
    async with AsyncSessionLocal() as session:
        # Find admin user
        result = await session.execute(select(User).where(User.username == "zbadmin"))
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            print("ERROR: Admin user 'zbadmin' not found.")
            sys.exit(1)

        # Generate new password
        new_password = secrets.token_urlsafe(32)
        admin_user.password_hash = get_password_hash(new_password)

        await session.commit()

        # Log the new password
        message = f"""
{'='*80}
ZERO BOARD - ADMIN PASSWORD RESET
{'='*80}
The admin password has been reset.

Username: zbadmin
New Password: {new_password}

This password has been hashed and stored in the database. Please store it securely.

{'='*80}
"""

        print(message)

        # Log to application log file (zero-board.log)
        logger.info("=" * 80)
        logger.info("ZERO BOARD - ADMIN PASSWORD RESET")
        logger.info("=" * 80)
        logger.info("Username: zbadmin")
        logger.warning(f"New admin password: {new_password}")  # Use WARNING level for visibility
        logger.info("This password has been hashed and stored in the database.")
        logger.info("=" * 80)
        
        log_file = Path(settings.log_dir) / "zero-board.log"
        print(f"Password reset logged to: {log_file}")


if __name__ == "__main__":
    asyncio.run(reset_admin_password())

