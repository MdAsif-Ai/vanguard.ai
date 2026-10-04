"""Integration test: readiness endpoint against live infrastructure."""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration


def test_readiness_reports_ready(client: TestClient) -> None:
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"] == {"database": "ok", "redis": "ok", "qdrant": "ok"}
