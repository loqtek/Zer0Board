"""Custom middleware for logging and request handling."""

import time
import logging
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("app.middleware")


class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log all HTTP requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request and log details."""
        start_time = time.time()
        
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} | "
            f"IP: {client_ip} | "
            f"Query: {dict(request.query_params) if request.query_params else 'None'}"
        )
        
        # Log request body for non-GET requests (if available)
        if request.method in ["POST", "PUT", "PATCH"]:
            try:
                body = await request.body()
                if body:
                    # Log first 500 chars of body to avoid logging sensitive data
                    body_preview = body.decode("utf-8", errors="ignore")[:500]
                    logger.debug(f"Request body preview: {body_preview}")
            except Exception as e:
                logger.debug(f"Could not read request body: {e}")
        
        # Process request
        try:
            response = await call_next(request)
            process_time = time.time() - start_time
            
            # Log response
            logger.info(
                f"Response: {request.method} {request.url.path} | "
                f"Status: {response.status_code} | "
                f"Time: {process_time:.3f}s | "
                f"IP: {client_ip}"
            )
            
            # Add process time header
            response.headers["X-Process-Time"] = str(process_time)
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            logger.error(
                f"Request error: {request.method} {request.url.path} | "
                f"Error: {str(e)} | "
                f"Time: {process_time:.3f}s | "
                f"IP: {client_ip}",
                exc_info=True
            )
            raise

