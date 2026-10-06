"""Hybrid retrieval service.

Embeds the query, searches Qdrant (org-filtered), and returns scored
evidence chunks with page metadata for citations.

Phase 4 scope: dense semantic retrieval only. BM25/sparse retrieval
and reranking (bge-reranker) are Phase 4.1 additions.
"""

import uuid
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger
from app.integrations.embeddings import get_embedding_provider
from app.integrations.qdrant import QdrantIntegration

logger = get_logger(__name__)

MAX_EVIDENCE_CHUNKS = 10
SEARCH_TOP_K = 20


class RetrievalResult:
    """A single retrieved chunk with metadata."""

    def __init__(
        self,
        *,
        text: str,
        score: float,
        document_name: str | None,
        page: int | None,
        chunk_index: int | None,
        document_id: str | None,
    ) -> None:
        self.text = text
        self.score = score
        self.document_name = document_name
        self.page = page
        self.chunk_index = chunk_index
        self.document_id = document_id


class RetrievalService:
    """Query embedding + Qdrant search, org-scoped."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def retrieve(
        self,
        query: str,
        *,
        organization_id: uuid.UUID,
        top_k: int = SEARCH_TOP_K,
    ) -> list[RetrievalResult]:
        """Embed the query and search for relevant chunks."""
        # 1. Embed the query (bge-m3)
        provider = get_embedding_provider(self._settings)
        query_vector = await provider.embed_query(query)

        # 2. Search Qdrant (org-filtered)
        api_key = (
            self._settings.qdrant_api_key.get_secret_value()
            if self._settings.qdrant_api_key
            else None
        )
        qdrant = QdrantIntegration(url=self._settings.qdrant_url, api_key=api_key)
        try:
            raw_results = await qdrant.search(
                collection=self._settings.qdrant_collection,
                query_vector=query_vector,
                organization_id=organization_id,
                limit=top_k,
            )
        finally:
            await qdrant.close()

        # 3. Convert to RetrievalResult
        results: list[RetrievalResult] = []
        for raw in raw_results:
            results.append(
                RetrievalResult(
                    text=raw.get("text", ""),
                    score=raw.get("score", 0.0),
                    document_name=raw.get("document_name"),
                    page=raw.get("page"),
                    chunk_index=raw.get("chunk_index"),
                    document_id=raw.get("document_id"),
                )
            )

        logger.info(
            "Retrieved %d chunks for query (org=%s, top_score=%.3f)",
            len(results),
            organization_id,
            results[0].score if results else 0.0,
        )
        return results

    def build_evidence_context(
        self, results: list[RetrievalResult], max_chunks: int = MAX_EVIDENCE_CHUNKS
    ) -> tuple[str, list[dict[str, Any]]]:
        """Build the numbered evidence context and citation metadata.

        Returns (evidence_text, citations_list).
        """
        evidence_parts: list[str] = []
        citations: list[dict[str, Any]] = []

        for i, result in enumerate(results[:max_chunks]):
            ref = i + 1
            page_label = f"Page {result.page}" if result.page else "Page unknown"
            doc_label = result.document_name or "Unknown document"

            # Truncate very long chunks for the prompt (keep full text in citations)
            text_for_prompt = result.text[:800]
            evidence_parts.append(f"[{ref}] Source: {doc_label}, {page_label}\n{text_for_prompt}")
            citations.append(
                {
                    "index": ref,
                    "document_name": result.document_name,
                    "page": result.page,
                    "text_snippet": result.text[:200],
                    "relevance_score": round(result.score, 3),
                }
            )

        return "\n\n".join(evidence_parts), citations
