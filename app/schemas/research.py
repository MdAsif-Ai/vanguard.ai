"""Research and evidence API schemas."""

import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


class ResearchCreate(BaseModel):
    question: str = Field(min_length=1, max_length=2000)
    mode: Literal["fast", "deep"] = "fast"


class AskQuestion(BaseModel):
    """Ask a question and get an evidence-grounded answer."""

    question: str = Field(min_length=1, max_length=2000)


class Citation(BaseModel):
    """A source reference backing an answer."""

    index: int
    document_name: str | None = None
    page: int | None = None
    text_snippet: str
    relevance_score: float | None = None


class AnswerResponse(BaseModel):
    """The answer with citations and metadata."""

    answer: str
    citations: list[Citation]
    status: str
    evidence_count: int = 0
    question: str
    research_job_id: uuid.UUID


class ResearchJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    user_id: uuid.UUID
    question: str
    status: str
    mode: str
    result: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class ResearchStatusResponse(BaseModel):
    id: uuid.UUID
    status: str


class EvidenceResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    claim_id: uuid.UUID
    document_id: uuid.UUID | None
    chunk_id: str | None
    source_type: str
    page: int | None
    passage: str
    support_status: str
    created_at: datetime


class EvidenceListResponse(BaseModel):
    items: list[EvidenceResponse]
