"""Document registry API: metadata CRUD, file upload, ingestion dispatch."""

import hashlib
import uuid
from pathlib import Path
from typing import Annotated

from fastapi import (
    APIRouter,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)

from app.api.dependencies import CurrentUser, DbSession, SettingsDep
from app.core.logging import get_logger
from app.integrations.qdrant import get_qdrant_integration
from app.integrations.storage import StorageError, get_storage_backend
from app.schemas.common import MessageResponse
from app.schemas.documents import (
    DocumentChunkListResponse,
    DocumentChunkResponse,
    DocumentCreate,
    DocumentListResponse,
    DocumentResponse,
    DocumentVersionListResponse,
    DocumentVersionResponse,
)
from app.services.documents import DocumentConflictError, DocumentService
from app.workers.tasks import process_document_task

router = APIRouter()
logger = get_logger(__name__)

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt", ".csv", ".md"}


@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: Annotated[UploadFile, File(description="Document file (PDF/DOCX/XLSX/TXT/CSV/MD)")],
    session: DbSession,
    current_user: CurrentUser,
    settings: SettingsDep,
    name: Annotated[str | None, Form(max_length=512)] = None,
    company: Annotated[str | None, Form(max_length=255)] = None,
    document_type: Annotated[str | None, Form(max_length=100)] = None,
    fiscal_year: Annotated[int | None, Form(ge=1900, le=2100)] = None,
) -> DocumentResponse:
    """Upload a document file, register it, and queue ingestion.

    The checksum is computed server-side; duplicates within the
    organization are rejected with 409. Ingestion runs asynchronously in
    the worker - poll GET /api/documents/{id} for status.

    Form validation: fiscal_year must be 1900-2100 (a clean 422 is
    returned for invalid values, not a 500).
    """
    filename = Path(file.filename or "upload").name
    if Path(filename).suffix.lower() not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {sorted(ALLOWED_UPLOAD_EXTENSIONS)}",
        )
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty."
        )
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File exceeds the 50 MB upload limit.",
        )

    checksum = hashlib.sha256(content).hexdigest()

    # Build the display name. If a custom name was provided WITHOUT a file
    # extension, append the original file's extension - the ingestion
    # parser detects the document format from the name's suffix.
    display_name = (name or filename).strip()
    if name and not Path(name).suffix and Path(filename).suffix:
        display_name = f"{display_name}{Path(filename).suffix}"

    data = DocumentCreate(
        name=display_name,
        company=company,
        document_type=document_type,
        fiscal_year=fiscal_year,
        checksum=checksum,
    )
    try:
        document = await DocumentService(session).create(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            data=data,
            file_size=len(content),
        )
    except DocumentConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc

    try:
        await get_storage_backend(settings).save(document.storage_key, content)
    except StorageError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store the uploaded file.",
        ) from exc

    process_document_task.delay(str(document.id))

    from app.core.monitoring import metrics

    metrics.record_business_event(
        "document_uploaded", organization_id=str(current_user.organization_id)
    )
    from app.core.monitoring import metrics

    metrics.record_business_event(
        "document_uploaded", organization_id=str(current_user.organization_id)
    )
    return DocumentResponse.model_validate(document)


@router.post("", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    body: DocumentCreate, session: DbSession, current_user: CurrentUser
) -> DocumentResponse:
    """Register a document record (metadata only, no file).

    Returns 409 when a document with the same checksum already exists in
    the organization.
    """
    try:
        document = await DocumentService(session).create(
            organization_id=current_user.organization_id,
            user_id=current_user.id,
            data=body,
        )
    except DocumentConflictError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc
    return DocumentResponse.model_validate(document)


@router.get("", response_model=DocumentListResponse)
async def list_documents(
    session: DbSession,
    current_user: CurrentUser,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
) -> DocumentListResponse:
    """List documents in the caller's organization (paginated)."""
    documents, total = await DocumentService(session).list_documents(
        organization_id=current_user.organization_id, skip=skip, limit=limit
    )
    return DocumentListResponse(
        items=[DocumentResponse.model_validate(document) for document in documents],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> DocumentResponse:
    document = await DocumentService(session).get(
        organization_id=current_user.organization_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentResponse.model_validate(document)


@router.get("/{document_id}/versions", response_model=DocumentVersionListResponse)
async def list_document_versions(
    document_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> DocumentVersionListResponse:
    """List stored versions of a document (organization-scoped)."""
    versions = await DocumentService(session).list_versions(
        organization_id=current_user.organization_id, document_id=document_id
    )
    if versions is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return DocumentVersionListResponse(
        items=[DocumentVersionResponse.model_validate(version) for version in versions],
        total=len(versions),
    )


@router.get("/{document_id}/chunks", response_model=DocumentChunkListResponse)
async def list_document_chunks(
    document_id: uuid.UUID,
    request: Request,
    session: DbSession,
    current_user: CurrentUser,
    settings: SettingsDep,
) -> DocumentChunkListResponse:
    """List the indexed chunks of an ingested document (org-scoped)."""
    document = await DocumentService(session).get(
        organization_id=current_user.organization_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    payloads = await get_qdrant_integration(request.app).list_document_chunks(
        collection=settings.qdrant_collection,
        organization_id=current_user.organization_id,
        document_id=document_id,
        limit=100,
    )
    items = [
        DocumentChunkResponse(
            id=str(payload.get("point_id")),
            chunk_index=int(payload.get("chunk_index") or 0),
            page=payload.get("page"),
            text=payload.get("text", ""),
        )
        for payload in payloads
    ]
    return DocumentChunkListResponse(items=items, total=len(items))


@router.delete("/{document_id}", response_model=MessageResponse)
async def delete_document(
    document_id: uuid.UUID,
    request: Request,
    session: DbSession,
    current_user: CurrentUser,
    settings: SettingsDep,
) -> MessageResponse:
    """Delete a document: DB rows, indexed chunks, and stored file."""
    document = await DocumentService(session).get(
        organization_id=current_user.organization_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    storage_key = document.storage_key
    organization_id = current_user.organization_id
    await DocumentService(session).delete(
        organization_id=organization_id,
        user_id=current_user.id,
        document=document,
    )

    # Best-effort cleanup of derived artifacts (never blocks the delete).
    try:
        await get_qdrant_integration(request.app).delete_document_points(
            collection=settings.qdrant_collection,
            organization_id=organization_id,
            document_id=document_id,
        )
    except Exception:
        logger.warning("Could not delete Qdrant points for document %s", document_id)
    try:
        await get_storage_backend(settings).delete(storage_key)
    except StorageError:
        logger.warning("Could not delete stored file for document %s", document_id)

    return MessageResponse(
        message="Document deleted.",
        detail="Database record, indexed chunks and the stored file were removed.",
    )


@router.post("/{document_id}/reindex", response_model=MessageResponse)
async def reindex_document(
    document_id: uuid.UUID, session: DbSession, current_user: CurrentUser
) -> MessageResponse:
    """Re-run the ingestion pipeline for a stored document."""
    document = await DocumentService(session).get(
        organization_id=current_user.organization_id, document_id=document_id
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    process_document_task.delay(str(document.id))

    from app.core.monitoring import metrics

    metrics.record_business_event(
        "document_uploaded", organization_id=str(current_user.organization_id)
    )
    return MessageResponse(
        message="Reindexing started.",
        detail=(
            "The worker will re-parse, re-chunk, re-embed and re-index the stored "
            "file. Poll GET /api/documents/{id} for status."
        ),
    )
