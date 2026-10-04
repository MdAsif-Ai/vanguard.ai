"""Unit tests for the document service (SQLite, no infrastructure)."""

import uuid
from collections.abc import AsyncIterator

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db import models
from app.db.database import Base
from app.schemas.documents import DocumentCreate
from app.services.documents import DocumentConflictError, DocumentService

CHECKSUM = "sha256-abc123"


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_async_engine("sqlite+aiosqlite://", poolclass=StaticPool)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.fixture
async def service(
    session_factory: async_sessionmaker[AsyncSession],
) -> AsyncIterator[DocumentService]:
    async with session_factory() as session:
        yield DocumentService(session)


async def test_create_document_creates_first_version(
    service: DocumentService, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    data = DocumentCreate(
        name="Apple 2025 10-K",
        company="Apple Inc.",
        document_type="10-K",
        fiscal_year=2025,
        checksum=CHECKSUM,
    )
    document = await service.create(organization_id=uuid.uuid4(), user_id=uuid.uuid4(), data=data)
    assert document.status == models.DocumentStatus.UPLOADED
    assert document.storage_key == f"{document.organization_id}/{document.id}"

    async with session_factory() as session:
        versions = list((await session.execute(select(models.DocumentVersion))).scalars())
    assert len(versions) == 1
    assert versions[0].document_id == document.id
    assert versions[0].version == 1
    assert versions[0].checksum == CHECKSUM


async def test_duplicate_checksum_raises_conflict(service: DocumentService) -> None:
    organization_id = uuid.uuid4()
    user_id = uuid.uuid4()
    await service.create(
        organization_id=organization_id,
        user_id=user_id,
        data=DocumentCreate(name="First", checksum=CHECKSUM),
    )
    with pytest.raises(DocumentConflictError):
        await service.create(
            organization_id=organization_id,
            user_id=user_id,
            data=DocumentCreate(name="Second", checksum=CHECKSUM),
        )


async def test_same_checksum_other_organization_allowed(service: DocumentService) -> None:
    document_a = await service.create(
        organization_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        data=DocumentCreate(name="A", checksum=CHECKSUM),
    )
    document_b = await service.create(
        organization_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        data=DocumentCreate(name="B", checksum=CHECKSUM),
    )
    assert document_a.organization_id != document_b.organization_id


async def test_create_document_writes_audit_event(
    service: DocumentService, session_factory: async_sessionmaker[AsyncSession]
) -> None:
    await service.create(
        organization_id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        data=DocumentCreate(name="Audited"),
    )
    async with session_factory() as session:
        actions = list((await session.execute(select(models.AuditLog.action))).scalars())
    assert "document.created" in actions
