"""Document API schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class DocumentCreate(BaseModel):
    """Metadata for registering a document record."""

    name: str = Field(min_length=1, max_length=512)
    company: str | None = Field(default=None, max_length=255)
    document_type: str | None = Field(default=None, max_length=100)
    fiscal_year: int | None = Field(default=None, ge=1900, le=2100)
    checksum: str | None = Field(default=None, max_length=128)


class DocumentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organization_id: uuid.UUID
    name: str
    company: str | None
    document_type: str | None
    fiscal_year: int | None
    storage_key: str
    status: str
    checksum: str | None
    file_size: int | None
    page_count: int | None
    chunk_count: int | None
    error: str | None
    created_at: datetime
    updated_at: datetime


class DocumentListResponse(BaseModel):
    items: list[DocumentResponse]
    total: int
    skip: int
    limit: int


class DocumentVersionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    document_id: uuid.UUID
    version: int
    checksum: str | None
    storage_key: str
    created_at: datetime


class DocumentVersionListResponse(BaseModel):
    items: list[DocumentVersionResponse]
    total: int


class DocumentChunkResponse(BaseModel):
    id: str
    chunk_index: int
    page: int | None
    text: str


class DocumentChunkListResponse(BaseModel):
    items: list[DocumentChunkResponse]
    total: int
