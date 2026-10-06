"""Background tasks.

process_document: the full ingestion pipeline.
run_research: the ask pipeline (retrieval + LLM reasoning).
"""

import asyncio
import uuid
from typing import Any

from app.core.config import get_settings
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
    from app.services.ingestion import run_ingestion

    return asyncio.run(run_ingestion(uuid.UUID(document_id)))


@celery_app.task(name="financerag.run_research")
def run_research_task(job_id: str, question: str, organization_id: str) -> dict[str, Any]:
    """Run the research pipeline: retrieve, reason, answer with citations."""
    from app.services.research import run_research

    return asyncio.run(
        run_research(
            uuid.UUID(job_id),
            question,
            uuid.UUID(organization_id),
        )
    )
