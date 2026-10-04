"""Integration test: Celery worker round-trip through Redis.

Verifies the worker actually executes a task (not just that the task is
importable). Requires `make up` so the worker container is running.
"""

import pytest

from app.workers.tasks import health_check_task

pytestmark = pytest.mark.integration


def test_health_check_task_executes_on_worker() -> None:
    result = health_check_task.delay()
    value = result.get(timeout=30)
    assert value["status"] == "ok"
    assert value["service"] == "financerag-worker"
    assert value["app_env"] in {"development", "production", "test"}
