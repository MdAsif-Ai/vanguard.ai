"""Document storage abstraction.

Phase 1 implements the local filesystem backend under STORAGE_PATH. The
interface is designed so S3-compatible backends can be added later
without changing callers. Keys are treated as untrusted input: paths
that escape the storage root are rejected.
"""

import asyncio
from abc import ABC, abstractmethod
from pathlib import Path

from app.core.config import Settings


class StorageError(Exception):
    """Raised for missing objects, invalid keys, or backend failures."""


class StorageBackend(ABC):
    """Contract for document object storage."""

    @abstractmethod
    async def save(self, key: str, data: bytes) -> None: ...

    @abstractmethod
    async def read(self, key: str) -> bytes: ...

    @abstractmethod
    async def delete(self, key: str) -> None: ...

    @abstractmethod
    async def exists(self, key: str) -> bool: ...

    @abstractmethod
    async def health_check(self) -> bool: ...


class LocalStorageBackend(StorageBackend):
    """Store objects as files under a root directory."""

    def __init__(self, root: str | Path) -> None:
        self._root = Path(root).resolve()
        try:
            self._root.mkdir(parents=True, exist_ok=True)
        except OSError as exc:
            raise StorageError(f"Cannot create or access the storage root: {self._root}") from exc

    def _resolve(self, key: str) -> Path:
        if not key:
            raise StorageError("Storage key must not be empty.")
        path = (self._root / key).resolve()
        if not path.is_relative_to(self._root):
            raise StorageError("Invalid storage key: path escapes the storage root.")
        return path

    async def save(self, key: str, data: bytes) -> None:
        path = self._resolve(key)
        await asyncio.to_thread(self._write, path, data)

    @staticmethod
    def _write(path: Path, data: bytes) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)

    async def read(self, key: str) -> bytes:
        path = self._resolve(key)
        try:
            return await asyncio.to_thread(path.read_bytes)
        except FileNotFoundError as exc:
            raise StorageError(f"Object not found: {key}") from exc

    async def delete(self, key: str) -> None:
        path = self._resolve(key)
        await asyncio.to_thread(path.unlink, True)

    async def exists(self, key: str) -> bool:
        path = self._resolve(key)
        return await asyncio.to_thread(path.is_file)

    async def health_check(self) -> bool:
        """Return True if the storage root is writable."""

        def _probe() -> None:
            probe = self._root / ".financerag-write-probe"
            probe.write_bytes(b"ok")
            probe.unlink()

        try:
            await asyncio.to_thread(_probe)
        except OSError:
            return False
        return True


def get_storage_backend(settings: Settings) -> StorageBackend:
    """Build the configured storage backend."""
    if settings.storage_backend == "local":
        return LocalStorageBackend(settings.storage_path)
    raise StorageError(f"Unsupported storage backend: {settings.storage_backend}")
