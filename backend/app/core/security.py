"""Security utilities for password hashing and verification."""

import bcrypt
import hashlib


def get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash."""
    # if the password is 72 bytes long or longer return error as password cannot be longer than 72 bytes
    if len(plain_password) > 72:
        raise ValueError("Password cannot be longer than 72 bytes")
    
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def hash_token(token: str) -> str:
    """Hash an API token using SHA-256 for storage."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def verify_token(plain_token: str, token_hash: str) -> bool:
    """Verify a token against its hash."""
    return hash_token(plain_token) == token_hash

