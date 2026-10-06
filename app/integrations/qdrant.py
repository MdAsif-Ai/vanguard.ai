"""Qdrant integration.

The only module that depends on the Qdrant SDK. The retrieval layer
(Phase 4) must talk to this abstraction, never to the SDK directly.
"""

import uuid
from typing import TYPE_CHECKING, Any

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

from app.core.config import Settings
from app.core.logging import get_logger

if TYPE_CHECKING:
    from fastapi import FastAPI

logger = get_logger(__name__)

# Default matches BAAI/bge-m3; the real dimension comes from the provider.
DEFAULT_VECTOR_SIZE = 1024


class QdrantIntegration:
    """Thin async wrapper around the Qdrant client."""

    def __init__(self, url: str, api_key: str | None = None, timeout: int = 30) -> None:
        self._client = AsyncQdrantClient(url=url, api_key=api_key, timeout=timeout)

    async def ping(self) -> bool:
        """Return True if Qdrant answers a trivial request."""
        try:
            await self._client.get_collections()
        except Exception:
            return False
        return True

    async def ensure_collection(self, name: str, vector_size: int = DEFAULT_VECTOR_SIZE) -> bool:
        """Create the collection if missing. Returns True if it was created."""
        if await self._client.collection_exists(name):
            return False
        await self._client.create_collection(
            collection_name=name,
            vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE),
        )
        logger.info("Created Qdrant collection %s (vector_size=%s)", name, vector_size)
        return True

    async def upsert_chunks(
        self,
        *,
        collection: str,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        vectors: list[list[float]],
        payloads: list[dict[str, Any]],
    ) -> int:
        """Upsert chunk vectors with org/document metadata. Returns point count."""
        points: list[PointStruct] = []
        for vector, payload in zip(vectors, payloads, strict=True):
            point_id = uuid.uuid5(
                uuid.NAMESPACE_URL, f"financerag/{document_id}/{payload['chunk_index']}"
            )
            points.append(
                PointStruct(
                    id=str(point_id),
                    vector=vector,
                    payload={
                        "organization_id": str(organization_id),
                        "document_id": str(document_id),
                        **payload,
                    },
                )
            )
        if points:
            await self._client.upsert(collection_name=collection, points=points, wait=True)
        return len(points)

    async def delete_document_points(
        self, *, collection: str, organization_id: uuid.UUID, document_id: uuid.UUID
    ) -> None:
        """Delete all indexed points for one document (org-scoped)."""
        await self._client.delete(
            collection_name=collection,
            points_selector=Filter(
                must=[
                    FieldCondition(
                        key="organization_id",
                        match=MatchValue(value=str(organization_id)),
                    ),
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=str(document_id)),
                    ),
                ]
            ),
        )

    async def list_document_chunks(
        self,
        *,
        collection: str,
        organization_id: uuid.UUID,
        document_id: uuid.UUID,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        """Scroll indexed chunks for one document (org-scoped)."""
        points, _ = await self._client.scroll(
            collection_name=collection,
            scroll_filter=Filter(
                must=[
                    FieldCondition(
                        key="organization_id",
                        match=MatchValue(value=str(organization_id)),
                    ),
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=str(document_id)),
                    ),
                ]
            ),
            limit=limit,
            with_payload=True,
        )
        results: list[dict[str, Any]] = []
        for point in points:
            payload = point.payload or {}
            results.append(
                {
                    "point_id": str(point.id),
                    "chunk_index": payload.get("chunk_index"),
                    "page": payload.get("page"),
                    "text": payload.get("text", ""),
                }
            )
        return results

    async def close(self) -> None:
        await self._client.close()


def get_qdrant_integration(app: "FastAPI") -> QdrantIntegration:
    """Return the app-scoped Qdrant integration, creating it on first use."""
    integration = getattr(app.state, "qdrant", None)
    if integration is None:
        settings: Settings = app.state.settings
        api_key = settings.qdrant_api_key.get_secret_value() if settings.qdrant_api_key else None
        integration = QdrantIntegration(url=settings.qdrant_url, api_key=api_key)
        app.state.qdrant = integration
    return integration
