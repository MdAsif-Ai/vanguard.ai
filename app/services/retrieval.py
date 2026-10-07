"""Hybrid retrieval service.

Pipeline: query preprocessing → dense search (Qdrant) → reranking
(bge-reranker) → filtering → deduplication → evidence building.

Improvements over Phase 4:
- Query preprocessing (entity extraction, cleaning, expansion)
- Reranking with bge-reranker-v2-m3 (cross-encoder)
- Source deduplication (max 3 chunks per document)
- Minimum score threshold filtering
"""

import uuid
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger
from app.integrations.embeddings import get_embedding_provider
from app.integrations.qdrant import QdrantIntegration
from app.services.query_processor import process_query
from app.services.reranker import RerankerResult, get_reranker

logger = get_logger(__name__)

MAX_EVIDENCE_CHUNKS = 10
SEARCH_TOP_K = 50
RERANK_TOP_K = 15
MAX_CHUNKS_PER_DOC = 3
MIN_SIMILARITY_SCORE = 0.3
MIN_RERANKER_SCORE = 0.1


class RetrievalResult:
    """A single retrieved chunk with metadata for citations."""

    def __init__(
        self,
        *,
        text: str,
        score: float,
        reranker_score: float | None,
        document_name: str | None,
        page: int | None,
        chunk_index: int | None,
        document_id: str | None,
    ) -> None:
        self.text = text
        self.score = score
        self.reranker_score = reranker_score
        self.document_name = document_name
        self.page = page
        self.chunk_index = chunk_index
        self.document_id = document_id


class RetrievalService:
    """Hybrid retrieval pipeline: embed → search → rerank → filter."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    async def retrieve(
        self,
        query: str,
        *,
        organization_id: uuid.UUID,
        top_k: int = MAX_EVIDENCE_CHUNKS,
    ) -> list[RetrievalResult]:
        """Full retrieval pipeline."""
        processed = process_query(query)
        logger.info(
            "Processed query: company=%s metric=%s period=%s type=%s",
            processed.company,
            processed.metric,
            processed.period,
            processed.question_type,
        )

        # 1. Dense search (using the primary query)
        raw_results = await self._dense_search(
            processed.cleaned, organization_id, limit=SEARCH_TOP_K
        )

        # Also search with expanded queries (deduplicate later)
        for expanded in processed.expanded_queries[1:2]:  # max 1 expansion
            expanded_results = await self._dense_search(
                expanded, organization_id, limit=SEARCH_TOP_K // 2
            )
            # Merge and deduplicate by text
            seen = {r.get("text", "") for r in raw_results}
            for r in expanded_results:
                if r.get("text", "") not in seen:
                    raw_results.append(r)

        if not raw_results:
            logger.info("No results found for query")
            return []

        # 2. Filter by minimum similarity score
        filtered = [r for r in raw_results if r.get("score", 0) >= MIN_SIMILARITY_SCORE]
        if not filtered:
            # Keep at least 5 results even if below threshold
            filtered = raw_results[:5]
            logger.warning("All results below threshold, keeping top 5")

        # 3. Rerank
        reranked = await self._rerank(processed.cleaned, filtered)

        # 4. Deduplicate by document (max N chunks per document)
        deduplicated = self._deduplicate_by_doc(reranked, max_per_doc=MAX_CHUNKS_PER_DOC)

        # 5. Convert to RetrievalResult
        results = self._to_results(deduplicated)

        logger.info(
            "Retrieval complete: %d candidates → %d after filter → %d after rerank → %d final",
            len(raw_results),
            len(filtered),
            len(reranked),
            len(results),
        )
        return results[:top_k]

    async def _dense_search(
        self, query: str, organization_id: uuid.UUID, limit: int
    ) -> list[dict[str, Any]]:
        """Dense vector search via Qdrant (org-scoped)."""
        provider = get_embedding_provider(self._settings)
        query_vector = await provider.embed_query(query)

        api_key = (
            self._settings.qdrant_api_key.get_secret_value()
            if self._settings.qdrant_api_key
            else None
        )
        qdrant = QdrantIntegration(url=self._settings.qdrant_url, api_key=api_key)
        try:
            raw = await qdrant.search(
                collection=self._settings.qdrant_collection,
                query_vector=query_vector,
                organization_id=organization_id,
                limit=limit,
            )
            return raw
        finally:
            await qdrant.close()

    async def _rerank(self, query: str, results: list[dict[str, Any]]) -> list[RerankerResult]:
        """Rerank results using bge-reranker."""
        reranker = get_reranker(self._settings)
        return await reranker.rerank(query, results, top_k=RERANK_TOP_K)

    def _deduplicate_by_doc(
        self, results: list[RerankerResult], max_per_doc: int
    ) -> list[RerankerResult]:
        """Limit chunks per document for diversity."""
        doc_counts: dict[str, int] = {}
        deduplicated: list[RerankerResult] = []

        for result in results:
            doc_id = result.original.get("document_id", "unknown")
            if doc_counts.get(doc_id, 0) < max_per_doc:
                deduplicated.append(result)
                doc_counts[doc_id] = doc_counts.get(doc_id, 0) + 1
            else:
                logger.debug("Skipping chunk from over-represented doc %s", doc_id)

        return deduplicated

    def _to_results(self, reranked: list[RerankerResult]) -> list[RetrievalResult]:
        """Convert reranked results to RetrievalResult objects."""
        results: list[RetrievalResult] = []
        for r in reranked:
            original = r.original
            # Skip results with very low reranker score
            if r.score < MIN_RERANKER_SCORE:
                continue
            results.append(
                RetrievalResult(
                    text=original.get("text", ""),
                    score=original.get("score", 0.0),
                    reranker_score=r.score,
                    document_name=original.get("document_name"),
                    page=original.get("page"),
                    chunk_index=original.get("chunk_index"),
                    document_id=original.get("document_id"),
                )
            )
        return results

    def build_evidence_context(
        self, results: list[RetrievalResult], max_chunks: int = MAX_EVIDENCE_CHUNKS
    ) -> tuple[str, list[dict[str, Any]]]:
        """Build the numbered evidence context and citation metadata."""
        evidence_parts: list[str] = []
        citations: list[dict[str, Any]] = []

        for i, result in enumerate(results[:max_chunks]):
            ref = i + 1
            page_label = f"Page {result.page}" if result.page else "Page unknown"
            doc_label = result.document_name or "Unknown document"

            text_for_prompt = result.text[:800]
            evidence_parts.append(f"[{ref}] Source: {doc_label}, {page_label}\n{text_for_prompt}")
            citations.append(
                {
                    "index": ref,
                    "document_name": result.document_name,
                    "page": result.page,
                    "text_snippet": result.text[:200],
                    "relevance_score": round(result.reranker_score or result.score, 3),
                }
            )

        return "\n\n".join(evidence_parts), citations
