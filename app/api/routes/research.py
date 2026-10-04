"""Research job API. Jobs are created as 'queued'; execution arrives later."""

import uuid

from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import CurrentUser, DbSession
from app.schemas.research import (
    EvidenceListResponse,
    EvidenceResponse,
    ResearchCreate,
    ResearchJobResponse,
    ResearchStatusResponse,
)
from app.services.evidence import EvidenceService
from app.services.research import ResearchService

router = APIRouter()


@router.post("", response_model=ResearchJobResponse, status_code=status.HTTP_201_CREATED)
async def create_research_job(
    body: ResearchCreate, session: DbSession, current_user: CurrentUser
) -> ResearchJobResponse:
    """Create a research job in the 'queued' state.

    No answer is generated in this phase; the orchestration pipeline is
    planned for a later phase.
    """
    job = await ResearchService(session).create_job(
        user=current_user, question=body.question, mode=body.mode
    )
    return ResearchJobResponse.model_validate(job)


@router.get("/{job_id}", response_model=ResearchJobResponse)
async def get_research_job(
    job_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> ResearchJobResponse:
    job = await ResearchService(session).get_job(
        organization_id=current_user.organization_id, job_id=job_id
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    return ResearchJobResponse.model_validate(job)


@router.get("/{job_id}/status", response_model=ResearchStatusResponse)
async def get_research_job_status(
    job_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> ResearchStatusResponse:
    job = await ResearchService(session).get_job(
        organization_id=current_user.organization_id, job_id=job_id
    )
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    return ResearchStatusResponse(id=job.id, status=job.status.value)


@router.get("/{job_id}/evidence", response_model=EvidenceListResponse)
async def list_research_evidence(
    job_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> EvidenceListResponse:
    """List evidence attached to a research job's claims (empty for now)."""
    evidence = await EvidenceService(session).list_for_job(
        organization_id=current_user.organization_id, research_job_id=job_id
    )
    if evidence is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Research job not found")
    return EvidenceListResponse(items=[EvidenceResponse.model_validate(item) for item in evidence])
