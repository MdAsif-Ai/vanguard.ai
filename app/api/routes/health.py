"""Health (liveness) and readiness endpoints."""

import asyncio
from typing import Any

from fastapi import APIRouter, Request, Response, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.logging import get_logger
from app.integrations.qdrant import get_qdrant_integration
from app.integrations.redis import get_redis_integration
from app.schemas.common import HealthResponse, ReadinessResponse

router = APIRouter()
logger = get_logger(__name__)

SERVICE_NAME = "financerag"
CHECK_TIMEOUT_SECONDS = 3.0

CheckResult = tuple[str, str | None]


@router.get("", response_model=HealthResponse)
async def health() -> HealthResponse:
    """Liveness check: the API process is up. Contacts no infrastructure."""
    return HealthResponse(status="ok", service=SERVICE_NAME)


async def _check_database(request: Request) -> CheckResult:
    try:
        factory = request.app.state.session_factory
        async with factory() as session:
            await asyncio.wait_for(session.execute(text("SELECT 1")), CHECK_TIMEOUT_SECONDS)
    except Exception as exc:
        logger.warning("Readiness check failed: database (%s)", type(exc).__name__)
        return "error", type(exc).__name__
    return "ok", None


async def _check_redis(request: Request) -> CheckResult:
    try:
        integration = get_redis_integration(request.app)
        ok = await asyncio.wait_for(integration.ping(), CHECK_TIMEOUT_SECONDS)
        if not ok:
            return "error", "ping failed"
    except Exception as exc:
        logger.warning("Readiness check failed: redis (%s)", type(exc).__name__)
        return "error", type(exc).__name__
    return "ok", None


async def _check_qdrant(request: Request) -> CheckResult:
    try:
        integration = get_qdrant_integration(request.app)
        ok = await asyncio.wait_for(integration.ping(), CHECK_TIMEOUT_SECONDS)
        if not ok:
            return "error", "ping failed"
    except Exception as exc:
        logger.warning("Readiness check failed: qdrant (%s)", type(exc).__name__)
        return "error", type(exc).__name__
    return "ok", None


@router.get(
    "/ready",
    responses={200: {"model": ReadinessResponse}, 503: {"model": ReadinessResponse}},
)
async def readiness(request: Request) -> Response:
    """Readiness check: actually verifies PostgreSQL, Redis and Qdrant."""
    database, redis_check, qdrant_check = await asyncio.gather(
        _check_database(request), _check_redis(request), _check_qdrant(request)
    )
    results: dict[str, CheckResult] = {
        "database": database,
        "redis": redis_check,
        "qdrant": qdrant_check,
    }
    checks = {name: result[0] for name, result in results.items()}
    details = {name: result[1] for name, result in results.items() if result[1] is not None}
    ready = all(value == "ok" for value in checks.values())
    body = ReadinessResponse(
        status="ready" if ready else "not_ready",
        checks=checks,
        details=details or None,
    ).model_dump()
    http_status = status.HTTP_200_OK if ready else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(status_code=http_status, content=body)


@router.get("/metrics")
async def get_metrics() -> dict[str, Any]:
    """Application metrics for monitoring."""
    from app.core.monitoring import metrics as _metrics

    return _metrics.get_summary()
