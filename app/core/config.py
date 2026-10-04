"""Application configuration.

All configuration comes from environment variables (optionally a `.env`
file). Only non-sensitive values have safe development defaults; secrets
must always be provided through the environment.
"""

import logging
from functools import lru_cache
from typing import Literal

from pydantic import SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_logger = logging.getLogger(__name__)

_INSECURE_DEFAULT_SECRET = "change-this-in-production"


class Settings(BaseSettings):
    """FinanceRAG runtime settings."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "VANGAURD.AI"
    app_env: Literal["development", "production", "test"] = "development"
    debug: bool = False
    log_level: str = "INFO"

    # --- Core infrastructure ---
    database_url: str = "postgresql+psycopg://financerag:financerag@localhost:5432/financerag"
    redis_url: str = "redis://localhost:6379/0"
    qdrant_url: str = "http://localhost:6333"
    qdrant_api_key: SecretStr | None = None
    qdrant_collection: str = "financerag_documents"

    # --- Document storage ---
    storage_backend: Literal["local"] = "local"
    storage_path: str = "./data/documents"

    # --- Authentication ---
    jwt_secret_key: SecretStr = SecretStr(_INSECURE_DEFAULT_SECRET)
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # --- LLM (OpenAI-compatible endpoint: vLLM, Ollama, external API) ---
    llm_base_url: str | None = None
    llm_api_key: SecretStr | None = None
    llm_model: str | None = None

    # --- Embeddings ---
    embedding_model: str | None = None
    embedding_device: str = "cpu"
    # --- First-run seeding (scripts/seed.py) ---
    seed_admin_email: str = "admin@financerag.dev"
    seed_admin_password: SecretStr | None = None

    @model_validator(mode="after")
    def _warn_about_insecure_defaults(self) -> "Settings":
        """Warn loudly if production runs with the development JWT secret."""
        if self.app_env == "production" and (
            self.jwt_secret_key.get_secret_value() == _INSECURE_DEFAULT_SECRET
        ):
            _logger.warning(
                "JWT_SECRET_KEY is set to the insecure development default. "
                "Set a strong secret before serving real users."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Return the cached application settings."""
    return Settings()
