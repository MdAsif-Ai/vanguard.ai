"""Research service: question -> retrieval -> LLM reasoning -> cited answer."""

import uuid
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.logging import get_logger
from app.db.models import ResearchJob, ResearchStatus
from app.db.repositories import AuditLogRepository, ResearchJobRepository

logger = get_logger(__name__)


class ResearchService:
    """API-level service: create and look up research jobs."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._jobs = ResearchJobRepository(session)
        self._audit = AuditLogRepository(session)

    async def create_job(
        self,
        *,
        user_id: uuid.UUID,
        organization_id: uuid.UUID,
        question: str,
        mode: str = "fast",
    ) -> ResearchJob:
        """Create a research job in the 'queued' state."""
        job = ResearchJob(
            id=uuid.uuid4(),
            organization_id=organization_id,
            user_id=user_id,
            question=question,
            status=ResearchStatus.QUEUED,
            mode=mode,
        )
        await self._jobs.create(job)
        await self._audit.log(
            organization_id=organization_id,
            user_id=user_id,
            action="research.created",
            resource_type="research_job",
            resource_id=str(job.id),
            meta={"mode": mode},
        )
        await self._session.commit()
        return job

    async def get_job(self, *, organization_id: uuid.UUID, job_id: uuid.UUID) -> ResearchJob | None:
        return await self._jobs.get(organization_id, job_id)


# --- The ask pipeline (runs in the worker) ---


async def run_research(
    job_id: uuid.UUID,
    question: str,
    organization_id: uuid.UUID,
) -> dict[str, Any]:
    """Full ask pipeline: retrieve evidence -> build prompt -> LLM -> answer."""
    from app.db.database import create_db_engine, create_session_factory
    from app.integrations.llm import LLMClient, LLMError
    from app.services.retrieval import RetrievalService

    settings = get_settings()
    engine = create_db_engine(settings)
    factory = create_session_factory(engine)

    try:
        # Mark as running
        async with factory() as session:
            job = await session.get(ResearchJob, job_id)
            if job is None:
                raise FileNotFoundError(f"Research job not found: {job_id}")
            job.status = ResearchStatus.RUNNING
            await session.commit()

        # Retrieve evidence
        retrieval = RetrievalService(settings)
        results = await retrieval.retrieve(question, organization_id=organization_id)

        if not results:
            result = {
                "answer": (
                    "I couldn't find relevant information in the uploaded "
                    "documents to answer this question."
                ),
                "citations": [],
                "status": "no_evidence",
                "evidence_count": 0,
                "question": question,
            }
            await _store_result(engine, factory, job_id, result)
            return result

        # Build evidence context + citations
        evidence_text, citations = retrieval.build_evidence_context(results)

        # Build prompt
        system_prompt = _build_system_prompt(evidence_text)

        # Call the LLM
        llm = LLMClient(
            base_url=settings.llm_base_url,
            api_key=settings.llm_api_key.get_secret_value() if settings.llm_api_key else None,
            model=settings.llm_model,
        )
        try:
            answer = await llm.generate(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
                temperature=0.1,
                max_tokens=1200,
            )
        except LLMError as exc:
            logger.error("LLM call failed: %s", exc)
            result = {
                "answer": (
                    "I found relevant evidence but couldn't generate an answer "
                    "due to an LLM error. Check that vLLM is running."
                ),
                "citations": citations,
                "status": "llm_error",
                "evidence_count": len(results),
                "question": question,
                "error": str(exc)[:500],
            }
            await _store_result(engine, factory, job_id, result)
            return result
        finally:
            await llm.close()

        # Store the result
        result = {
            "answer": answer,
            "citations": citations,
            "status": "answered",
            "evidence_count": len(results),
            "question": question,
        }
        await _store_result(engine, factory, job_id, result)
        return result

    except Exception as exc:
        logger.exception("Research failed for job %s", job_id)
        result = {
            "answer": f"An error occurred during research: {exc}",
            "citations": [],
            "status": "failed",
            "evidence_count": 0,
            "question": question,
            "error": str(exc)[:500],
        }
        await _store_result(engine, factory, job_id, result)
        return result
    finally:
        await engine.dispose()


def _build_system_prompt(evidence_text: str) -> str:
    """Construct the evidence-grounded system prompt."""
    return (
        "You are a precise financial analyst assistant. Answer the user's "
        "question using ONLY the evidence provided below.\n\n"
        "RULES:\n"
        "- Cite your sources using reference numbers [1], [2], etc.\n"
        "- If the evidence contains specific numbers, use them exactly.\n"
        "- If the evidence doesn't contain enough information, say so clearly.\n"
        "- Do not make up facts, numbers, or citations.\n"
        "- Keep your answer concise and directly responsive.\n\n"
        f"EVIDENCE:\n{evidence_text}"
    )


async def _store_result(
    engine: Any,
    factory: Any,
    job_id: uuid.UUID,
    result: dict[str, Any],
) -> None:
    """Store the result and update the job status."""
    status = result.get("status", "completed")
    job_status = ResearchStatus.COMPLETED
    if status in ("failed", "llm_error"):
        job_status = ResearchStatus.FAILED

    async with factory() as session:
        job = await session.get(ResearchJob, job_id)
        if job is not None:
            job.status = job_status
            job.result = result
            await session.commit()
