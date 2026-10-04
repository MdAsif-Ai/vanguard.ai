"""SQLAlchemy models for the FinanceRAG foundation schema.

Design notes:
- UUID primary keys generated on the Python side.
- Portable enum columns (VARCHAR + CHECK) storing lowercase values.
- Audit rows deliberately have NO foreign keys, so audit history survives
  user/organization deletion.
- Cascades remove dependent rows when a parent is deleted.
"""

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

import sqlalchemy as sa
from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


def _enum_values(enum_cls: type[enum.Enum]) -> list[str]:
    return [member.value for member in enum_cls]


def _str_enum(enum_cls: type[enum.StrEnum]) -> sa.Enum:
    """Portable enum column (VARCHAR + CHECK constraint) storing values."""
    return sa.Enum(
        enum_cls,
        name=enum_cls.__name__.lower(),
        values_callable=_enum_values,
        native_enum=False,
        length=50,
    )


class UserRole(enum.StrEnum):
    ADMIN = "admin"
    USER = "user"


class DocumentStatus(enum.StrEnum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class ResearchStatus(enum.StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    ABORTED = "aborted"


class ResearchMode(enum.StrEnum):
    FAST = "fast"
    DEEP = "deep"


class MessageRole(enum.StrEnum):
    USER = "user"
    ASSISTANT = "assistant"
    SYSTEM = "system"
    TOOL = "tool"


class ClaimStatus(enum.StrEnum):
    PENDING = "pending"
    SUPPORTED = "supported"
    CONTRADICTED = "contradicted"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class SourceType(enum.StrEnum):
    INTERNAL_DOCUMENT = "internal_document"
    WEB = "web"
    FINANCIAL_DATA = "financial_data"


class SupportStatus(enum.StrEnum):
    PENDING = "pending"
    SUPPORTS = "supports"
    CONTRADICTS = "contradicts"
    INSUFFICIENT_EVIDENCE = "insufficient_evidence"


class TimestampMixin:
    """Adds created_at / updated_at with database-side defaults."""

    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
        onupdate=sa.func.now(),
    )


class Organization(TimestampMixin, Base):
    __tablename__ = "organizations"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(sa.String(255), unique=True)


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(sa.String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(sa.String(255))
    role: Mapped[UserRole] = mapped_column(
        _str_enum(UserRole), default=UserRole.USER, server_default="user"
    )
    is_active: Mapped[bool] = mapped_column(default=True, server_default=sa.true())


class Document(TimestampMixin, Base):
    __tablename__ = "documents"
    __table_args__ = (
        sa.Index("ix_documents_status", "status"),
        sa.Index("ix_documents_checksum", "checksum"),
    )

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(sa.String(512))
    company: Mapped[str | None] = mapped_column(sa.String(255))
    document_type: Mapped[str | None] = mapped_column(sa.String(100))
    fiscal_year: Mapped[int | None] = mapped_column(sa.Integer())
    storage_key: Mapped[str] = mapped_column(sa.String(1024))
    status: Mapped[DocumentStatus] = mapped_column(
        _str_enum(DocumentStatus), default=DocumentStatus.UPLOADED, server_default="uploaded"
    )
    checksum: Mapped[str | None] = mapped_column(sa.String(128))
    file_size: Mapped[int | None] = mapped_column(sa.BigInteger())
    page_count: Mapped[int | None] = mapped_column(sa.Integer())
    chunk_count: Mapped[int | None] = mapped_column(sa.Integer())
    error: Mapped[str | None] = mapped_column(sa.Text())


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    __table_args__ = (UniqueConstraint("document_id", "version"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(sa.Integer())
    checksum: Mapped[str | None] = mapped_column(sa.String(128))
    storage_key: Mapped[str] = mapped_column(sa.String(1024))
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class FinancialFact(Base):
    """Structured financial fact, e.g. company=Apple, metric=revenue,
    value=416161000000, currency=USD, period=FY2025, page=8.

    Extraction from documents arrives in a later phase.
    """

    __tablename__ = "financial_facts"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    company: Mapped[str | None] = mapped_column(sa.String(255))
    metric: Mapped[str] = mapped_column(sa.String(255))
    value: Mapped[Decimal | None] = mapped_column(sa.Numeric(precision=24, scale=6))
    unit: Mapped[str | None] = mapped_column(sa.String(50))
    currency: Mapped[str | None] = mapped_column(sa.String(8))
    period: Mapped[str | None] = mapped_column(sa.String(50))
    page: Mapped[int | None] = mapped_column(sa.Integer())
    source_text: Mapped[str | None] = mapped_column(sa.Text())
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class ResearchJob(TimestampMixin, Base):
    __tablename__ = "research_jobs"
    __table_args__ = (sa.Index("ix_research_jobs_status", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    question: Mapped[str] = mapped_column(sa.Text())
    status: Mapped[ResearchStatus] = mapped_column(
        _str_enum(ResearchStatus), default=ResearchStatus.QUEUED, server_default="queued"
    )
    mode: Mapped[ResearchMode] = mapped_column(
        _str_enum(ResearchMode), default=ResearchMode.FAST, server_default="fast"
    )
    result: Mapped[dict[str, Any] | None] = mapped_column(sa.JSON())


class ResearchMessage(Base):
    """Observable research trace: user/assistant/system/tool messages.

    This is for application-level events, NOT hidden chain-of-thought.
    """

    __tablename__ = "research_messages"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    research_job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    role: Mapped[MessageRole] = mapped_column(_str_enum(MessageRole))
    content: Mapped[str] = mapped_column(sa.Text())
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class Claim(Base):
    __tablename__ = "claims"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    research_job_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("research_jobs.id", ondelete="CASCADE"), index=True
    )
    claim: Mapped[str] = mapped_column(sa.Text())
    claim_type: Mapped[str | None] = mapped_column(sa.String(100))
    status: Mapped[ClaimStatus] = mapped_column(
        _str_enum(ClaimStatus), default=ClaimStatus.PENDING, server_default="pending"
    )
    confidence: Mapped[float | None] = mapped_column(sa.Float())
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class Evidence(Base):
    __tablename__ = "evidence"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claims.id", ondelete="CASCADE"), index=True
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("documents.id", ondelete="CASCADE"), index=True
    )
    chunk_id: Mapped[str | None] = mapped_column(sa.String(255))
    source_type: Mapped[SourceType] = mapped_column(_str_enum(SourceType))
    page: Mapped[int | None] = mapped_column(sa.Integer())
    passage: Mapped[str] = mapped_column(sa.Text())
    support_status: Mapped[SupportStatus] = mapped_column(
        _str_enum(SupportStatus), default=SupportStatus.PENDING, server_default="pending"
    )
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class Calculation(Base):
    """Deterministic financial calculation attached to a claim."""

    __tablename__ = "calculations"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    claim_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("claims.id", ondelete="CASCADE"), index=True
    )
    operation: Mapped[str] = mapped_column(sa.String(100))
    inputs: Mapped[dict[str, Any] | None] = mapped_column(sa.JSON())
    formula: Mapped[str | None] = mapped_column(sa.Text())
    result: Mapped[dict[str, Any] | None] = mapped_column(sa.JSON())
    verified: Mapped[bool] = mapped_column(default=False, server_default=sa.false())
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
    )


class AuditLog(Base):
    """Enterprise audit trail.

    organization_id / user_id are plain UUIDs (no FK) so audit history
    survives deletion of the referenced rows.
    """

    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(sa.Uuid(), primary_key=True, default=uuid.uuid4)
    organization_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid(), index=True)
    user_id: Mapped[uuid.UUID | None] = mapped_column(sa.Uuid(), index=True)
    action: Mapped[str] = mapped_column(sa.String(100), index=True)
    resource_type: Mapped[str | None] = mapped_column(sa.String(100))
    resource_id: Mapped[str | None] = mapped_column(sa.String(64))
    meta: Mapped[dict[str, Any] | None] = mapped_column("metadata", sa.JSON())
    created_at: Mapped[datetime] = mapped_column(
        sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True
    )
