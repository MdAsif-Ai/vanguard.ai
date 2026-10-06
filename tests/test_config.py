"""Settings system tests."""

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_settings_defaults() -> None:
    settings = Settings(_env_file=None)
    assert settings.app_name == "VANGUARD.AI"
    assert settings.app_env == "development"
    assert settings.jwt_algorithm == "HS256"
    assert settings.access_token_expire_minutes == 60
    assert settings.storage_backend == "local"
    assert settings.qdrant_collection == "financerag_documents"


def test_settings_load_from_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("DATABASE_URL", "postgresql+psycopg://user:pass@localhost:5432/db")
    monkeypatch.setenv("JWT_SECRET_KEY", "unit-test-secret")
    settings = Settings(_env_file=None)
    assert settings.app_env == "production"
    assert settings.database_url == "postgresql+psycopg://user:pass@localhost:5432/db"
    assert settings.jwt_secret_key.get_secret_value() == "unit-test-secret"


def test_settings_reject_invalid_app_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "staging")
    with pytest.raises(ValidationError):
        Settings(_env_file=None)
