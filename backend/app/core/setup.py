"""First-run setup logic for creating admin user."""

import secrets
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user import User
from app.core.security import get_password_hash

logger = logging.getLogger("app.setup")


async def setup_database(session: AsyncSession) -> None:
    """Initialize database and create admin user if needed."""
    # Check if any users exist
    result = await session.execute(select(User))
    users = result.scalars().all()

    if users:
        logger.info("Database already initialized. Users exist.")
        return

    # Generate strong random password
    admin_password = secrets.token_urlsafe(32)
    password_hash = get_password_hash(admin_password)

    # Check if admin user already exists
    existing_admin = await session.execute(
        select(User).where(User.username == "zbadmin")
    )
    if existing_admin.scalar_one_or_none():
        logger.info("Admin user 'zbadmin' already exists. Skipping creation.")
        return

    # Create admin user
    admin_user = User(
        username="zbadmin",
        password_hash=password_hash,
        is_admin=True,
    )

    try:
        session.add(admin_user)
        await session.commit()
    except Exception as e:
        await session.rollback()
        # Check if it's a unique constraint violation
        if "UNIQUE constraint" in str(e) or "unique" in str(e).lower():
            logger.info("Admin user 'zbadmin' already exists. Skipping creation.")
            return
        raise

    # Log admin credentials
    setup_message = f"""
{'='*80}
ZERO BOARD - ADMIN CREDENTIALS
{'='*80}
IMPORTANT: Please store these credentials securely. The password will NOT be
stored in plaintext in the database and will only be shown once.

Username: zbadmin
Password: {admin_password}

This password has been hashed and stored in the database. You can change it
after logging in using the change-password endpoint.

To reset the admin password, use the script:
  python scripts/reset_admin_password.py

{'='*80}
"""

    # Print to stdout (flush immediately for Docker logs)
    print(setup_message, flush=True)

    # Log to application log file (zero-board.log)
    logger.info("=" * 80)
    logger.info("ZERO BOARD - ADMIN CREDENTIALS CREATED")
    logger.info("=" * 80)
    logger.info("Username: zbadmin")
    logger.warning(f"Admin password: {admin_password}")  # Use WARNING level for visibility
    logger.info("This password has been hashed and stored in the database.")
    logger.info("You can change it after logging in using the change password functionality.")
    logger.info("To reset the admin password, use: python scripts/reset_admin_password.py")
    logger.info("=" * 80)

