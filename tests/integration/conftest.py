"""Shared fixtures for integration tests.

These tests run against the live Compose stack from the host:

    make up
    make migrate
    make test-integration

The Makefile overrides hostnames to localhost (the Compose ports are
published for development). Every test creates unique organizations and
deletes them (cascading) afterwards, so the development database is not
polluted with test data.
"""

import uuid
from collections.abc import AsyncIterator
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.database import create_db_engine, create_session_factory
from app.db.models import Organization, User, UserRole
from app.main import app

TEST_PASSWORD = "integration-test-password-123"


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
async def session_factory() -> AsyncIterator[async_sessionmaker[AsyncSession]]:
    engine = create_db_engine(get_settings())
    factory = create_session_factory(engine)
    try:
        yield factory
    finally:
        await engine.dispose()


@pytest.fixture
async def org_user(
    client: TestClient, session_factory: async_sessionmaker[AsyncSession]
) -> AsyncIterator[SimpleNamespace]:
    context = await _create_org_user(session_factory, client)
    try:
        yield context
    finally:
        await _delete_organization(session_factory, context.org_id)


@pytest.fixture
async def other_org_user(
    client: TestClient, session_factory: async_sessionmaker[AsyncSession]
) -> AsyncIterator[SimpleNamespace]:
    context = await _create_org_user(session_factory, client)
    try:
        yield context
    finally:
        await _delete_organization(session_factory, context.org_id)


async def _create_org_user(
    factory: async_sessionmaker[AsyncSession], client: TestClient
) -> SimpleNamespace:
    suffix = uuid.uuid4().hex[:8]
    email = f"user-{suffix}@integration-test.dev"
    async with factory() as session:
        organization = Organization(name=f"integration-org-{suffix}")
        session.add(organization)
        await session.flush()
        session.add(
            User(
                organization_id=organization.id,
                email=email,
                password_hash=hash_password(TEST_PASSWORD),
                role=UserRole.USER,
                is_active=True,
            )
        )
        await session.commit()
        org_id = organization.id

    response = client.post("/api/auth/login", json={"email": email, "password": TEST_PASSWORD})
    assert response.status_code == 200, response.text
    token = response.json()["access_token"]
    return SimpleNamespace(org_id=org_id, email=email, headers={"Authorization": f"Bearer {token}"})


async def _delete_organization(
    factory: async_sessionmaker[AsyncSession], org_id: uuid.UUID
) -> None:
    async with factory() as session:
        organization = await session.get(Organization, org_id)
        if organization is not None:
            await session.delete(organization)
            await session.commit()
