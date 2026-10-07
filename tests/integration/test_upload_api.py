"""Integration tests: file upload endpoint.

Note: uploading dispatches a real ingestion task. The first-ever run
downloads the embedding/parsing models into the worker's models volume
(one-time, may take minutes); these tests do not wait for completion.
"""

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

FILE_CONTENT = b"Q1 revenue was $100 million. Q2 revenue was $120 million."


async def test_upload_document(client: TestClient, org_user) -> None:
    response = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", FILE_CONTENT, "text/plain")},
        data={"name": "Quarterly notes", "company": "Test Inc.", "fiscal_year": "2025"},
        headers=org_user.headers,
    )
    assert response.status_code == 201, response.text
    body = response.json()
    assert body["name"] == "Quarterly notes.txt"
    assert body["status"] in {"uploaded", "processing"}
    assert len(body["checksum"]) == 64
    assert body["file_size"] == len(FILE_CONTENT)

    versions = client.get(f"/api/documents/{body['id']}/versions", headers=org_user.headers)
    assert versions.status_code == 200
    assert versions.json()["total"] == 1


async def test_upload_duplicate_checksum_returns_409(client: TestClient, org_user) -> None:
    first = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", FILE_CONTENT, "text/plain")},
        headers=org_user.headers,
    )
    assert first.status_code == 201
    second = client.post(
        "/api/documents/upload",
        files={"file": ("copy.txt", FILE_CONTENT, "text/plain")},
        headers=org_user.headers,
    )
    assert second.status_code == 409


async def test_upload_rejects_unsupported_extension(client: TestClient, org_user) -> None:
    response = client.post(
        "/api/documents/upload",
        files={"file": ("payload.exe", b"MZ...", "application/octet-stream")},
        headers=org_user.headers,
    )
    assert response.status_code == 400


def test_upload_requires_authentication(client: TestClient) -> None:
    response = client.post(
        "/api/documents/upload",
        files={"file": ("a.txt", b"data", "text/plain")},
    )
    assert response.status_code == 401
