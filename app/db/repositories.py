"""Repository layer.

Thin, typed data-access helpers. Services own business logic and
transactions; repositories only query and mutate rows. All organization
scoping is enforced here, never in route handlers.
"""

import uuid
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import AuditLog, Claim, Document, DocumentVersion, Evidence, ResearchJob, User


class UserRepository:
    """Access to user rows."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self._session.get(User, user_id)

    async def get_by_email(self, email: str) -> User | None:
        result = await self._session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()


class DocumentRepository:
    """Access to document rows and versions, always scoped by organization."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, document: Document) -> Document:
        self._session.add(document)
        await self._session.flush()
        return document

    async def get(self, organization_id: uuid.UUID, document_id: uuid.UUID) -> Document | None:
        result = await self._session.execute(
            select(Document).where(
                Document.id == document_id,
                Document.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_by_checksum(self, organization_id: uuid.UUID, checksum: str) -> Document | None:
        result = await self._session.execute(
            select(Document).where(
                Document.organization_id == organization_id,
                Document.checksum == checksum,
            )
        )
        return result.scalar_one_or_none()

    async def list_documents(
        self, organization_id: uuid.UUID, *, skip: int, limit: int
    ) -> tuple[list[Document], int]:
        total = (
            await self._session.execute(
                select(func.count())
                .select_from(Document)
                .where(Document.organization_id == organization_id)
            )
        ).scalar_one()
        result = await self._session.execute(
            select(Document)
            .where(Document.organization_id == organization_id)
            .order_by(Document.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all()), int(total)

    async def delete(self, document: Document) -> None:
        await self._session.delete(document)
        await self._session.flush()

    async def create_version(self, version: DocumentVersion) -> DocumentVersion:
        self._session.add(version)
        await self._session.flush()
        return version

    async def list_versions(self, document_id: uuid.UUID) -> list[DocumentVersion]:
        result = await self._session.execute(
            select(DocumentVersion)
            .where(DocumentVersion.document_id == document_id)
            .order_by(DocumentVersion.version)
        )
        return list(result.scalars().all())


class ResearchJobRepository:
    """Access to research job rows, always scoped by organization."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def create(self, job: ResearchJob) -> ResearchJob:
        self._session.add(job)
        await self._session.flush()
        return job

    async def get(self, organization_id: uuid.UUID, job_id: uuid.UUID) -> ResearchJob | None:
        result = await self._session.execute(
            select(ResearchJob).where(
                ResearchJob.id == job_id,
                ResearchJob.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()


class EvidenceRepository:
    """Access to evidence rows joined through claims and research jobs."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_for_job(
        self, organization_id: uuid.UUID, research_job_id: uuid.UUID
    ) -> list[Evidence]:
        result = await self._session.execute(
            select(Evidence)
            .join(Claim, Evidence.claim_id == Claim.id)
            .join(ResearchJob, Claim.research_job_id == ResearchJob.id)
            .where(
                ResearchJob.id == research_job_id,
                ResearchJob.organization_id == organization_id,
            )
            .order_by(Evidence.created_at, Evidence.id)
        )
        return list(result.scalars().all())

    async def get(self, organization_id: uuid.UUID, evidence_id: uuid.UUID) -> Evidence | None:
        result = await self._session.execute(
            select(Evidence)
            .join(Claim, Evidence.claim_id == Claim.id)
            .join(ResearchJob, Claim.research_job_id == ResearchJob.id)
            .where(
                Evidence.id == evidence_id,
                ResearchJob.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()


class AuditLogRepository:
    """Writes audit events. Never logs secrets or document contents."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def log(
        self,
        *,
        organization_id: uuid.UUID | None,
        user_id: uuid.UUID | None,
        action: str,
        resource_type: str | None = None,
        resource_id: str | None = None,
        meta: dict[str, Any] | None = None,
    ) -> AuditLog:
        entry = AuditLog(
            organization_id=organization_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            meta=meta,
        )
        self._session.add(entry)
        await self._session.flush()
        return entry
