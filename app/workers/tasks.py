"""Background tasks.

process_document runs the full ingestion pipeline in the worker. The API
can import this module safely: heavy ML imports live inside
app.services.ingestion functions, not at module import time.
"""

import asyncio
import uuid
from typing import Any

from app.core.config import get_settings
from app.services.ingestion import run_ingestion
from app.workers.celery_app import celery_app


@celery_app.task(name="financerag.health_check")
def health_check_task() -> dict[str, str]:
    """Prove the worker can consume tasks (and reach the Redis broker)."""
    settings = get_settings()
    return {
        "status": "ok",
        "service": "financerag-worker",
        "app_env": settings.app_env,
    }


@celery_app.task(name="financerag.process_document")
def process_document_task(document_id: str) -> dict[str, Any]:
    """Run the ingestion pipeline: parse, chunk, embed, index."""
    return asyncio.run(run_ingestion(uuid.UUID(document_id)))
