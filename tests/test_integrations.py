"""Unit tests for integration failure paths (unreachable endpoints)."""

from app.integrations.qdrant import QdrantIntegration
from app.integrations.redis import RedisIntegration


async def test_qdrant_ping_unreachable() -> None:
    integration = QdrantIntegration(url="http://127.0.0.1:1", timeout=1)
    try:
        assert await integration.ping() is False
    finally:
        await integration.close()


async def test_redis_ping_unreachable() -> None:
    integration = RedisIntegration(url="redis://127.0.0.1:1/0")
    try:
        assert await integration.ping() is False
    finally:
        await integration.close()
