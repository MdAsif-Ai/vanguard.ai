"""Simple in-memory rate limiter for API protection.

Uses a sliding window per user. No external dependencies (Redis not needed
for single-instance deployments).
"""

import time
from collections import defaultdict
from typing import Any

from fastapi import HTTPException, Request, status

from app.core.logging import get_logger

logger = get_logger(__name__)

# Rate limit configuration
RATE_LIMIT_PER_MINUTE = 30  # requests per minute per user
RATE_LIMIT_WINDOW = 60.0  # seconds

# Storage: user_id -> list of timestamps
_request_history: dict[str, list[float]] = defaultdict(list)


class RateLimiter:
    """Sliding window rate limiter."""

    def __init__(self, limit: int = RATE_LIMIT_PER_MINUTE) -> None:
        self._limit = limit
        self._window = RATE_LIMIT_WINDOW

    def check(self, identifier: str) -> bool:
        """Check if the identifier is within rate limit. Returns True if allowed."""
        now = time.time()
        history = _request_history[identifier]

        # Remove old entries
        while history and history[0] < now - self._window:
            history.pop(0)

        if len(history) >= self._limit:
            return False

        history.append(now)
        return True

    def remaining(self, identifier: str) -> int:
        """Return remaining requests in the current window."""
        now = time.time()
        history = _request_history[identifier]
        while history and history[0] < now - self._window:
            history.pop(0)
        return max(0, self._limit - len(history))

    def reset(self, identifier: str) -> None:
        """Reset rate limit for an identifier."""
        _request_history.pop(identifier, None)


# Global instance
rate_limiter = RateLimiter()


async def rate_limit_middleware(request: Request, call_next: Any) -> Any:
    """FastAPI middleware: rate limits per user (from JWT) or IP."""
    # Skip health endpoints
    path = request.url.path
    if "/api/health" in path or "/docs" in path or "/openapi" in path:
        return await call_next(request)

    # Get identifier from auth header or IP
    identifier = request.client.host if request.client else "unknown"
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        # Use a hash of the token as identifier
        import hashlib

        identifier = hashlib.sha256(auth_header.encode()).hexdigest()[:16]

    if not rate_limiter.check(identifier):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"Rate limit exceeded. Try again in {int(rate_limiter._window)} seconds.",
        )

    response = await call_next(request)

    # Add rate limit headers
    response.headers["X-RateLimit-Limit"] = str(rate_limiter._limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_limiter.remaining(identifier))

    return response
