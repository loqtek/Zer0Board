"""Main FastAPI application entry point."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.middleware import LoggingMiddleware
from app.core.database import AsyncSessionLocal, init_database_schema
from app.core.setup import setup_database

# Setup logging first
setup_logging()
logger = logging.getLogger("app.main")

# Initialize FastAPI app
app = FastAPI(
    title="Zero Board API",
    description="Self-hosted digital board API",
    version="0.1.0",
    docs_url="/api/docs" if settings.environment == "development" else None,
    redoc_url="/api/redoc" if settings.environment == "development" else None,
    redirect_slashes=False,  # Disable automatic redirects for trailing slashes
)

# Setup rate limiting
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add logging middleware (before CORS to log all requests)
app.add_middleware(LoggingMiddleware)
# CORS configuration
if settings.cors_origins:
    origins = [origin.strip() for origin in settings.cors_origins.split(",")]
else:
    # throw error if cors origins are not set
    raise ValueError("CORS origins are not set")

logger.debug(f"CORS origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Root endpoint."""
    return {"message": "Zero Board API", "version": "0.1.0"}


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy"}


# Import routers
from app.api.v1 import auth, boards
from app.api.v1 import settings as settings_router
from app.api.v1 import board_access_tokens

app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(boards.router, prefix="/api/boards", tags=["boards"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["settings"])
app.include_router(board_access_tokens.router, prefix="/api/v1", tags=["board-access-tokens"])


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize database schema and setup on application startup."""
    logger.info("=" * 80)
    logger.info("Zero Board API - Starting up")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Database: {settings.database_type}")
    logger.info(f"Log level: {settings.log_level}")
    logger.info("=" * 80)
    
    logger.info("Initializing database schema...")
    try:
        # Initialize database schema (create tables if they don't exist)
        init_database_schema()
        logger.info("Database schema initialized successfully.")

        # Run setup (create admin user if needed)
        logger.info("Running database setup...")
        async with AsyncSessionLocal() as session:
            await setup_database(session)
            await session.commit()

        logger.info("Database setup completed successfully.")
        logger.info("=" * 80)
        logger.info("Zero Board API - Ready to accept requests")
        logger.info("=" * 80)
    except RuntimeError:
        # Re-raise runtime errors (like missing tables)
        raise
    except Exception as e:
        logger.error(f"Fatal error during startup: {e}", exc_info=True)
        raise

