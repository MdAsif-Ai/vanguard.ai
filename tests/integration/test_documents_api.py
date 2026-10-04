"""Integration tests: document CRUD, versioning, isolation."""

import uuid

import pytest
from fastapi.testclient import TestClient

pytestmark = pytest.mark.integration

DOCUMENT = {
    "name": "Apple 2025 10-K",
    "company": "Apple Inc.",
    "document_type": "10-K",
    "fiscal_year": 2025,
}


def _create_document(client: TestClient, headers: dict, **overrides) -> dict:
    payload = {**DOCUMENT, **overrides}
    response = client.post("/api/documents", json=payload, headers=headers)
    assert response.status_code == 201, response.text
    return response.json()


async def test_create_document(client: TestClient, org_user) -> None:
    body = _create_document(client, org_user.headers)
    assert body["name"] == DOCUMENT["name"]
    assert body["status"] == "uploaded"
    assert body["organization_id"] == str(org_user.org_id)
    assert body["storage_key"]


async def test_create_document_creates_first_version(client: TestClient, org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.get(f"/api/documents/{document['id']}/versions", headers=org_user.headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 1
    assert body["items"][0]["version"] == 1
    assert body["items"][0]["document_id"] == document["id"]


async def test_get_document(client: TestClient, org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.get(f"/api/documents/{document['id']}", headers=org_user.headers)
    assert response.status_code == 200
    assert response.json()["id"] == document["id"]


async def test_get_missing_document_returns_404(client: TestClient, org_user) -> None:
    response = client.get(f"/api/documents/{uuid.uuid4()}", headers=org_user.headers)
    assert response.status_code == 404


async def test_list_documents(client: TestClient, org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.get("/api/documents", headers=org_user.headers)
    assert response.status_code == 200
    body = response.json()
    assert body["total"] >= 1
    assert document["id"] in [item["id"] for item in body["items"]]


async def test_delete_document(client: TestClient, org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.delete(f"/api/documents/{document['id']}", headers=org_user.headers)
    assert response.status_code == 200
    assert (
        client.get(f"/api/documents/{document['id']}", headers=org_user.headers).status_code == 404
    )


async def test_reindex_returns_501(client: TestClient, org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.post(f"/api/documents/{document['id']}/reindex", headers=org_user.headers)
    assert response.status_code == 501


async def test_duplicate_checksum_returns_409(client: TestClient, org_user) -> None:
    checksum = uuid.uuid4().hex
    _create_document(client, org_user.headers, checksum=checksum)
    response = client.post(
        "/api/documents",
        json={**DOCUMENT, "name": "Duplicate copy", "checksum": checksum},
        headers=org_user.headers,
    )
    assert response.status_code == 409


async def test_duplicate_checksum_scoped_to_organization(
    client: TestClient, org_user, other_org_user
) -> None:
    checksum = uuid.uuid4().hex
    _create_document(client, org_user.headers, checksum=checksum)
    body = _create_document(client, other_org_user.headers, checksum=checksum)
    assert body["organization_id"] == str(other_org_user.org_id)


async def test_organization_isolation(client: TestClient, org_user, other_org_user) -> None:
    document = _create_document(client, org_user.headers)
    response = client.get(f"/api/documents/{document['id']}", headers=other_org_user.headers)
    assert response.status_code == 404
    delete_response = client.delete(
        f"/api/documents/{document['id']}", headers=other_org_user.headers
    )
    assert delete_response.status_code == 404


def test_unauthenticated_document_access_returns_401(client: TestClient) -> None:
    assert client.get("/api/documents").status_code == 401
