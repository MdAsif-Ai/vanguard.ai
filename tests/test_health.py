"""Liveness endpoint tests (no infrastructure required)."""

from fastapi.testclient import TestClient

from app.main import app


def test_health_returns_ok() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "financerag"}


def test_health_returns_request_id_header() -> None:
    with TestClient(app) as client:
        response = client.get("/api/health")
    assert response.headers.get("X-Request-ID")


def test_unknown_route_returns_404() -> None:
    with TestClient(app) as client:
        response = client.get("/api/does-not-exist")
    assert response.status_code == 404
