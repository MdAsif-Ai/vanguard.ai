"""FinanceRAG FastAPI application entrypoint."""

import time
import uuid
from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

from app import __version__
from app.api.router import api_router
from app.core.config import Settings, get_settings
from app.core.logging import get_logger, setup_logging
from app.db.database import create_db_engine, create_session_factory

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Create and dispose infrastructure clients.

    The async engine is created lazily (no connection is made until first
    use), so startup succeeds even when dependencies are unreachable;
    /api/health/ready reports their real status.
    """
    settings: Settings = app.state.settings
    engine = create_db_engine(settings)
    app.state.engine = engine
    app.state.session_factory = create_session_factory(engine)
    try:
        yield
    finally:
        await engine.dispose()
        qdrant = getattr(app.state, "qdrant", None)
        if qdrant is not None:
            await qdrant.close()
        redis_integration = getattr(app.state, "redis", None)
        if redis_integration is not None:
            await redis_integration.close()


def _register_middleware(app: FastAPI) -> None:
    """Attach request logging, metrics, and rate limiting."""

    @app.middleware("http")
    async def request_context_middleware(
        request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            logger.exception(
                "Unhandled exception request_id=%s method=%s path=%s",
                request_id,
                request.method,
                request.url.path,
            )
            return JSONResponse(
                status_code=500,
                content={"detail": "Internal server error."},
                headers={"X-Request-ID": request_id},
            )
        duration_ms = (time.perf_counter() - start) * 1000
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request completed request_id=%s method=%s path=%s status=%s duration_ms=%.1f",
            request_id,
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
        )

        # Record metrics
        from app.core.monitoring import metrics

        metrics.record_request(request.url.path, response.status_code, duration_ms)

        return response

    # Rate limiting middleware (after logging, before routes)
    from app.services.rate_limiter import rate_limit_middleware

    app.middleware("http")(rate_limit_middleware)


def create_app() -> FastAPI:
    """Build the FastAPI application."""
    settings = get_settings()
    setup_logging(settings)
    app = FastAPI(
        title=settings.app_name,
        version=__version__,
        description=(
            "Self-hosted financial intelligence and document reasoning platform. "
            "Answers are designed to be evidence-grounded, verifiable and auditable."
        ),
        lifespan=lifespan,
    )
    app.state.settings = settings
    _register_middleware(app)
    app.include_router(api_router)
    return app


app = create_app()
