"""Reranking service using BAAI/bge-reranker-v2-m3.

Reranks retrieved chunks by relevance to the query. Runs on GPU
when available, CPU otherwise. The reranker is a cross-encoder:
it scores (query, passage) pairs jointly, which is more accurate
than bi-encoder similarity alone.
"""

import asyncio
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class RerankerResult:
    """A reranked chunk with its new score."""

    def __init__(self, index: int, score: float, original: dict[str, Any]) -> None:
        self.index = index
        self.score = score
        self.original = original


class Reranker:
    """Cross-encoder reranker using bge-reranker-v2-m3."""

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._model: Any = None
        self._device = "cpu"  # Conservative default
        self._model_name = "BAAI/bge-reranker-v2-m3"
        self._initialized = False

    def _ensure_loaded(self) -> None:
        """Lazy-load the reranker model."""
        if self._initialized:
            return
        try:
            import torch  # type: ignore[import-not-found]
            from transformers import (  # type: ignore[import-not-found]
                AutoModelForSequenceClassification,
                AutoTokenizer,
            )

            self._device = "cuda" if torch.cuda.is_available() else "cpu"
            self._tokenizer = AutoTokenizer.from_pretrained(self._model_name)
            self._model = AutoModelForSequenceClassification.from_pretrained(self._model_name)
            self._model.to(self._device)
            self._model.eval()
            self._initialized = True
            logger.info("Loaded reranker %s on %s", self._model_name, self._device)
        except ImportError:
            logger.warning(
                "Transformers not available — reranking disabled, "
                "falling back to raw similarity scores."
            )

    async def rerank(
        self,
        query: str,
        results: list[dict[str, Any]],
        top_k: int = 10,
    ) -> list[RerankerResult]:
        """Rerank results by relevance to the query.

        Args:
            query: The user's question.
            results: Retrieved chunks from Qdrant (list of dicts with 'text').
            top_k: Number of results to return after reranking.

        Returns:
            List of RerankerResult sorted by reranker score.
        """
        if not results:
            return []

        self._ensure_loaded()

        if self._model is None:
            # Fallback: return original scores in original order
            return [
                RerankerResult(i, r.get("score", 0.0), r) for i, r in enumerate(results[:top_k])
            ]

        # Build query-passage pairs
        pairs = [(query, r.get("text", "")) for r in results]

        # Score all pairs (run in thread to avoid blocking)
        scores = await asyncio.to_thread(self._score_pairs, pairs)

        # Sort by score (higher is better)
        scored = [RerankerResult(i, score, results[i]) for i, score in enumerate(scores)]
        scored.sort(key=lambda x: x.score, reverse=True)

        return scored[:top_k]

    def _score_pairs(self, pairs: list[tuple[str, str]]) -> list[float]:
        """Score query-passage pairs using the cross-encoder."""
        import torch

        with torch.no_grad():
            inputs = self._tokenizer(
                [q for q, _ in pairs],
                [p for _, p in pairs],
                padding=True,
                truncation=True,
                max_length=512,
                return_tensors="pt",
            ).to(self._device)

            logits = self._model(**inputs).logits.squeeze(-1)
            # Convert to 0-1 score via sigmoid
            scores = torch.sigmoid(logits).cpu().tolist()

        if isinstance(scores, float):
            scores = [scores]
        return scores


# Module-level cache (one instance per process)
_reranker: Reranker | None = None


def get_reranker(settings: Settings) -> Reranker:
    """Return the cached reranker instance."""
    global _reranker
    if _reranker is None:
        _reranker = Reranker(settings)
    return _reranker
