"""Application configuration using Pydantic settings."""

import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    database_type: str = "sqlite"
    database_url: str = "sqlite+aiosqlite:///./zeroboard.db"

    # Application
    secret_key: str = "change-me-in-production"
    environment: str = "development"
    log_level: str = "INFO"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = ""

    # Session
    session_cookie_name: str = "zero_board_session"
    session_cookie_httponly: bool = True
    session_cookie_secure: bool = False  # Auto-set to True in development when using sameSite=none
    session_cookie_samesite: str = "lax"  # Auto-adjusted to "none" in development for cross-origin support
    session_expire_minutes: int = 1440

    # Rate Limiting
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60
    login_rate_limit_per_minute: int = 5

    # Logging
    log_dir: str = "./logs"

    model_config = SettingsConfigDict(
        env_file="../.env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def is_development(self) -> bool:
        """Check if running in development mode."""
        return self.environment.lower() == "development"

    @property
    def is_production(self) -> bool:
        """Check if running in production mode."""
        return self.environment.lower() == "production"

    def validate_production(self) -> None:
        """Validate production settings and raise errors for insecure configurations."""
        if not self.is_production:
            return
        
        import sys
        
        # Check SECRET_KEY
        if self.secret_key == "change-me-in-production" or len(self.secret_key) < 32:
            print("=" * 80, file=sys.stderr)
            print("ERROR: SECRET_KEY is not set or is insecure!", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            print("Generate a secure key with:", file=sys.stderr)
            print('  python3 -c "import secrets; print(secrets.token_urlsafe(32))"', file=sys.stderr)
            print("Then set SECRET_KEY in your .env file.", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            raise ValueError("SECRET_KEY must be set to a secure value in production (minimum 32 characters)")
        
        # Check CORS_ORIGINS
        if not self.cors_origins or self.cors_origins.startswith("http://localhost"):
            print("=" * 80, file=sys.stderr)
            print("WARNING: CORS_ORIGINS appears to be set to localhost in production!", file=sys.stderr)
            print("Set CORS_ORIGINS to your actual frontend domain(s) in .env", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            # Don't fail, but warn
        
        # Check SESSION_COOKIE_SECURE
        if not self.session_cookie_secure:
            print("=" * 80, file=sys.stderr)
            print("WARNING: SESSION_COOKIE_SECURE is false in production!", file=sys.stderr)
            print("Set SESSION_COOKIE_SECURE=true in .env (requires HTTPS)", file=sys.stderr)
            print("=" * 80, file=sys.stderr)
            # Don't fail, but warn


# Global settings instance
settings = Settings()

# Validate production settings on import
if settings.is_production:
    settings.validate_production()

