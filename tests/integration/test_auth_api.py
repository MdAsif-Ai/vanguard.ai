"""Integration tests: authentication API (success and failure paths)."""

import uuid

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.core.security import create_access_token

from .conftest import TEST_PASSWORD

pytestmark = pytest.mark.integration

WRONG_SECRET = "not-the-configured-secret-0123456789abcdef"


async def test_login_success(client: TestClient, org_user) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": org_user.email, "password": TEST_PASSWORD},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] > 0
    assert body["access_token"]


async def test_login_wrong_password(client: TestClient, org_user) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": org_user.email, "password": "definitely-wrong"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


async def test_login_unknown_email(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "nobody@integration-test.dev", "password": "whatever"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password."


async def test_me_authenticated(client: TestClient, org_user) -> None:
    response = client.get("/api/auth/me", headers=org_user.headers)
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == org_user.email
    assert body["role"] == "user"
    assert body["organization_id"] == str(org_user.org_id)
    assert body["is_active"] is True


def test_me_missing_token(client: TestClient) -> None:
    assert client.get("/api/auth/me").status_code == 401


def test_me_malformed_token(client: TestClient) -> None:
    headers = {"Authorization": "Bearer not-a-real-jwt"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_me_token_signed_with_wrong_secret(client: TestClient) -> None:
    token = create_access_token(
        user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        role="user",
        secret_key=WRONG_SECRET,
    )
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_me_expired_token(client: TestClient) -> None:
    settings = get_settings()
    token = create_access_token(
        user_id=uuid.uuid4(),
        organization_id=uuid.uuid4(),
        role="user",
        secret_key=settings.jwt_secret_key.get_secret_value(),
        expires_minutes=-1,
    )
    headers = {"Authorization": f"Bearer {token}"}
    assert client.get("/api/auth/me", headers=headers).status_code == 401
