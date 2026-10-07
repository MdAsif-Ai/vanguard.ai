"""Document ingestion pipeline: parse -> chunk -> embed -> index.

Runs inside the Celery worker (process_document_task). Heavy dependencies
(docling, sentence-transformers, torch) are imported lazily inside
functions, so this module stays importable from the API image, which does
not carry the [ingest] extras.

Phase 3 scope:
- Parsing: Docling for PDF/DOCX/XLSX (text items with page provenance);
  plain-text read for TXT/CSV/MD. Structured table extraction arrives with
  the financial-facts phase.
- Chunking: page-aware windows with overlap (pure, unit-tested).
- Embeddings: local bge-m3 via sentence-transformers (configurable).
- Indexing: Qdrant points carry organization/document metadata so Phase 4
  retrieval can filter by permission scope before scoring.
"""

import asyncio
import tempfile
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.logging import get_logger
from app.db.database import create_db_engine, create_session_factory
from app.db.models import Document, DocumentStatus
from app.db.repositories import AuditLogRepository
from app.integrations.embeddings import get_embedding_provider
from app.integrations.qdrant import QdrantIntegration
from app.integrations.storage import get_storage_backend
from app.services.facts import FactExtractionService

logger = get_logger(__name__)

CHUNK_MAX_CHARS = 1200
CHUNK_OVERLAP_CHARS = 200
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".docx", ".xlsx", ".txt", ".csv", ".md"}
PLAIN_TEXT_EXTENSIONS = {".txt", ".csv", ".md"}


@dataclass
class Chunk:
    index: int
    page: int | None
    text: str


def build_chunks(
    segments: list[tuple[int | None, str]],
    *,
    max_chars: int = CHUNK_MAX_CHARS,
    overlap: int = CHUNK_OVERLAP_CHARS,
) -> list[Chunk]:
    """Page-aware chunker: merge same-page segments, split long pages.

    Pure function (no I/O, no models) so it is unit-testable.
    """
    merged: list[tuple[int | None, list[str]]] = []
    for page, raw in segments:
        text = raw.strip()
        if not text:
            continue
        if merged and merged[-1][0] == page:
            merged[-1][1].append(text)
        else:
            merged.append((page, [text]))

    chunks: list[Chunk] = []
    for page, parts in merged:
        text = "\n".join(parts)
        start = 0
        length = len(text)
        while start < length:
            end = min(start + max_chars, length)
            if end < length:
                # prefer breaking at whitespace near the window end
                space = text[start:end].rfind(" ")
                if space > max_chars // 2:
                    end = start + space
            piece = text[start:end].strip()
            if piece:
                chunks.append(Chunk(index=len(chunks), page=page, text=piece))
            if end >= length:
                break
            start = max(end - overlap, start + 1)
    return chunks


# --- Parsing (sync, runs in a worker thread) ---------------------------------


def _parse_to_segments(content: bytes, filename: str) -> list[tuple[int | None, str]]:
    """Parse file bytes into ordered (page, text) segments."""
    suffix = Path(filename).suffix.lower()
    if suffix in PLAIN_TEXT_EXTENSIONS:
        return [(None, content.decode("utf-8", errors="replace"))]
    return _parse_with_docling(content, suffix)


_docling_converter: Any = None


def _get_docling_converter() -> Any:
    global _docling_converter
    if _docling_converter is None:
        from docling.document_converter import DocumentConverter

        _docling_converter = DocumentConverter()
    return _docling_converter


def _parse_with_docling(content: bytes, suffix: str) -> list[tuple[int | None, str]]:
    try:
        converter = _get_docling_converter()
    except ImportError as exc:
        raise RuntimeError(
            "docling is not installed. The worker image must install the "
            "'ingest' extra: pip install .[ingest]"
        ) from exc

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as handle:
        handle.write(content)
        path = Path(handle.name)
    try:
        result = converter.convert(path)
    finally:
        path.unlink(missing_ok=True)

    segments: list[tuple[int | None, str]] = []
    for item in result.document.texts:
        text = getattr(item, "text", None)
        if not isinstance(text, str) or not text.strip():
            continue
        page = None
        prov = getattr(item, "prov", None)
        if prov:
            candidate = getattr(prov[0], "page_no", None)
            if isinstance(candidate, int):
                page = candidate
        segments.append((page, text.strip()))
    if not segments:
        markdown = result.document.export_to_markdown()
        if markdown.strip():
            segments = [(None, markdown)]
    return segments


# --- Pipeline ----------------------------------------------------------------


class IngestionPipeline:
    def __init__(self, session: AsyncSession, settings: Settings) -> None:
        self._session = session
        self._settings = settings
        self._audit = AuditLogRepository(session)

    async def process(self, document_id: uuid.UUID) -> dict[str, Any]:
        document = await self._session.get(Document, document_id)
        if document is None:
            raise FileNotFoundError(f"Document not found: {document_id}")

        document.status = DocumentStatus.PROCESSING
        document.error = None
        await self._session.commit()

        content = await get_storage_backend(self._settings).read(document.storage_key)
        segments = await asyncio.to_thread(_parse_to_segments, content, document.name)
        chunks = build_chunks(segments)
        if not chunks:
            raise ValueError("No extractable text found in the document.")

        provider = get_embedding_provider(self._settings)
        vectors = await provider.embed_documents([chunk.text for chunk in chunks])

        payloads = [
            {
                "chunk_index": chunk.index,
                "page": chunk.page,
                "text": chunk.text,
                "document_name": document.name,
                "company": document.company,
                "fiscal_year": document.fiscal_year,
            }
            for chunk in chunks
        ]
        fact_service = FactExtractionService(self._session, self._settings)
        fact_count = await fact_service.extract_from_document(document)
        logger.info("Extracted %d financial facts", fact_count)
        api_key = (
            self._settings.qdrant_api_key.get_secret_value()
            if self._settings.qdrant_api_key
            else None
        )
        qdrant = QdrantIntegration(url=self._settings.qdrant_url, api_key=api_key)
        try:
            await qdrant.ensure_collection(
                self._settings.qdrant_collection, vector_size=provider.dimension
            )
            # Delete old points first so re-ingestion is idempotent.
            await qdrant.delete_document_points(
                collection=self._settings.qdrant_collection,
                organization_id=document.organization_id,
                document_id=document.id,
            )
            await qdrant.upsert_chunks(
                collection=self._settings.qdrant_collection,
                organization_id=document.organization_id,
                document_id=document.id,
                vectors=vectors,
                payloads=payloads,
            )
        finally:
            await qdrant.close()

        pages = sorted({chunk.page for chunk in chunks if chunk.page is not None})
        document.status = DocumentStatus.READY
        document.page_count = len(pages) if pages else None
        document.chunk_count = len(chunks)
        document.error = None
        await self._audit.log(
            organization_id=document.organization_id,
            user_id=None,
            action="document.processed",
            resource_type="document",
            resource_id=str(document.id),
            meta={"chunks": len(chunks), "pages": document.page_count},
        )
        await self._session.commit()
        return {
            "document_id": str(document_id),
            "status": "ready",
            "chunks": len(chunks),
            "pages": document.page_count,
        }


async def _mark_failed(document_id: uuid.UUID, error: str) -> None:
    settings = get_settings()
    engine = create_db_engine(settings)
    factory = create_session_factory(engine)
    try:
        async with factory() as session:
            document = await session.get(Document, document_id)
            if document is None:
                return
            document.status = DocumentStatus.FAILED
            document.error = error[:2000]
            await session.commit()
    finally:
        await engine.dispose()


async def run_ingestion(document_id: uuid.UUID) -> dict[str, Any]:
    """Entry point used by the Celery task. Records failures on the document."""
    settings = get_settings()
    engine = create_db_engine(settings)
    factory = create_session_factory(engine)
    try:
        try:
            async with factory() as session:
                pipeline = IngestionPipeline(session, settings)
                return await pipeline.process(document_id)
        except Exception as exc:
            logger.exception("Ingestion failed for document %s", document_id)
            await _mark_failed(document_id, str(exc))
            return {"document_id": str(document_id), "status": "failed", "error": str(exc)[:500]}
    finally:
        await engine.dispose()
