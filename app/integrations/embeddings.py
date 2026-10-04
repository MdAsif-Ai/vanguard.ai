"""Embedding provider abstraction.

Phase 3: local sentence-transformers provider (default BAAI/bge-m3,
1024 dims). Heavy imports are lazy so the API image can import this
module without the [ingest] extras.
"""

import asyncio
from abc import ABC, abstractmethod
from typing import Any

from app.core.config import Settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class EmbeddingError(Exception):
    """Raised when embeddings are unavailable or not configured."""


class EmbeddingProvider(ABC):
    """Contract for embedding backends."""

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Dimensionality of the embedding vectors."""

    @abstractmethod
    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        """Embed a batch of document chunks."""

    @abstractmethod
    async def embed_query(self, text: str) -> list[float]:
        """Embed a single query."""


class SentenceTransformerProvider(EmbeddingProvider):
    """Local embeddings via sentence-transformers (bge-m3 by default)."""

    def __init__(self, model_name: str, device: str) -> None:
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError as exc:
            raise EmbeddingError(
                "sentence-transformers is not installed. The worker image must "
                "install the 'ingest' extra: pip install .[ingest]"
            ) from exc
        self._model: Any = SentenceTransformer(model_name, device=device)
        self._dimension = int(self._model.get_sentence_embedding_dimension())
        logger.info(
            "Loaded embedding model %s on %s (%d dims)", model_name, device, self._dimension
        )

    @property
    def dimension(self) -> int:
        return self._dimension

    async def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        return await asyncio.to_thread(self._encode, list(texts))

    async def embed_query(self, text: str) -> list[float]:
        vectors = await self.embed_documents([text])
        return vectors[0]

    def _encode(self, texts: list[str]) -> list[list[float]]:
        embeddings = self._model.encode(texts, normalize_embeddings=True, show_progress_bar=False)
        return [[float(value) for value in vector] for vector in embeddings]


_provider_cache: dict[tuple[str, str], EmbeddingProvider] = {}


def get_embedding_provider(settings: Settings) -> EmbeddingProvider:
    """Return the cached embedding provider (model loads once per worker)."""
    if not settings.embedding_model:
        raise EmbeddingError("EMBEDDING_MODEL is not configured (set it to BAAI/bge-m3).")
    key = (settings.embedding_model, settings.embedding_device)
    if key not in _provider_cache:
        logger.info("Loading embedding model %s on %s (first use downloads weights)", *key)
        _provider_cache[key] = SentenceTransformerProvider(key[0], key[1])
    return _provider_cache[key]
