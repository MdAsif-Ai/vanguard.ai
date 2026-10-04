"""Document management service (database-level operations).

File upload, parsing, embedding and Qdrant indexing are Phase 3; this
service only manages the document registry in the organization scope.

Versioning (Phase 2):
- Every new document gets its first DocumentVersion row (version 1).
- Duplicate checksums within one organization are rejected with a
  conflict instead of being silently overwritten.
- Higher versions arrive with re-ingestion in Phase 3.
"""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Document, DocumentStatus, DocumentVersion
from app.db.repositories import AuditLogRepository, DocumentRepository
from app.schemas.documents import DocumentCreate


class DocumentConflictError(Exception):
    """Raised when a document with the same checksum exists in the organization."""


def _storage_key(organization_id: uuid.UUID, document_id: uuid.UUID) -> str:
    return f"{organization_id}/{document_id}"


class DocumentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._documents = DocumentRepository(session)
        self._audit = AuditLogRepository(session)

    async def create(
        self,
        *,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        data: DocumentCreate,
    ) -> Document:
        """Register a document record with status 'uploaded' and version 1."""
        if data.checksum is not None:
            existing = await self._documents.get_by_checksum(organization_id, data.checksum)
            if existing is not None:
                raise DocumentConflictError(
                    "A document with this checksum already exists in the organization."
                )

        document_id = uuid.uuid4()
        document = Document(
            id=document_id,
            organization_id=organization_id,
            name=data.name,
            company=data.company,
            document_type=data.document_type,
            fiscal_year=data.fiscal_year,
            checksum=data.checksum,
            storage_key=_storage_key(organization_id, document_id),
            status=DocumentStatus.UPLOADED,
        )
        await self._documents.create(document)

        await self._documents.create_version(
            DocumentVersion(
                id=uuid.uuid4(),
                document_id=document_id,
                version=1,
                checksum=data.checksum,
                storage_key=document.storage_key,
            )
        )

        await self._audit.log(
            organization_id=organization_id,
            user_id=user_id,
            action="document.created",
            resource_type="document",
            resource_id=str(document_id),
            meta={"name": data.name},
        )
        await self._session.commit()
        return document

    async def get(self, *, organization_id: uuid.UUID, document_id: uuid.UUID) -> Document | None:
        return await self._documents.get(organization_id, document_id)

    async def list_documents(
        self, *, organization_id: uuid.UUID, skip: int, limit: int
    ) -> tuple[list[Document], int]:
        return await self._documents.list_documents(organization_id, skip=skip, limit=limit)

    async def list_versions(
        self, *, organization_id: uuid.UUID, document_id: uuid.UUID
    ) -> list[DocumentVersion] | None:
        """Return versions, or None when the document does not exist (org-scoped)."""
        document = await self._documents.get(organization_id, document_id)
        if document is None:
            return None
        return await self._documents.list_versions(document_id)

    async def delete(
        self,
        *,
        organization_id: uuid.UUID,
        user_id: uuid.UUID,
        document: Document,
    ) -> None:
        """Delete the document record (cascades to versions/facts/evidence).

        Stored files are removed when ingestion lands in Phase 3.
        """
        await self._documents.delete(document)
        await self._audit.log(
            organization_id=organization_id,
            user_id=user_id,
            action="document.deleted",
            resource_type="document",
            resource_id=str(document.id),
        )
        await self._session.commit()
