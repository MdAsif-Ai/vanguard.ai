"""Financial fact and calculation schemas."""

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class FactExtractionStatus(StrEnum):
    PENDING = "pending"
    EXTRACTED = "extracted"
    FAILED = "failed"


class FinancialFactResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    company: str | None
    metric: str
    value: float | None
    unit: str | None
    currency: str | None
    period: str | None
    page: int | None
    source_text: str | None
    created_at: datetime


class FinancialFactListResponse(BaseModel):
    items: list[FinancialFactResponse]
    total: int


class CalculationRequest(BaseModel):
    """Request to perform a deterministic financial calculation."""

    operation: str = Field(
        description="Operation: sum|subtract|multiply|divide|percentage_change|ratio|margin"
    )
    inputs: dict[str, float] = Field(description="Named inputs for the calculation")
    organization_id: uuid.UUID


class CalculationResult(BaseModel):
    """Result of a deterministic calculation."""

    operation: str
    inputs: dict[str, float]
    formula: str
    result: float
    verified: bool = True


class AnalystResponse(BaseModel):
    """Structured financial analysis response."""

    company: str | None
    period: str | None
    metrics: list[dict[str, Any]]
    calculations: list[CalculationResult]
    source_documents: list[str]
    generated_at: datetime
