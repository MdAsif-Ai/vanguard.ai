"""Shared API schemas."""

from typing import Literal

from pydantic import BaseModel


class HealthResponse(BaseModel):
    status: str
    service: str


class ReadinessResponse(BaseModel):
    status: Literal["ready", "not_ready"]
    checks: dict[str, str]
    details: dict[str, str] | None = None


class MessageResponse(BaseModel):
    message: str
    detail: str | None = None
