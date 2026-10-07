"""Application metrics collection.

Tracks request counts, latency, and business events for monitoring.
Exposes /api/health/metrics for Prometheus-style scraping.
"""

import time
from collections import Counter, defaultdict
from typing import Any

from app.core.logging import get_logger

logger = get_logger(__name__)

# Global metrics storage
_request_count: Counter = Counter()
_request_latency: dict[str, list[float]] = defaultdict(list)
_business_events: Counter = Counter()
_start_time = time.time()

# Maximum latency samples to keep
MAX_LATENCY_SAMPLES = 100


class Metrics:
    """Application metrics collector."""

    @staticmethod
    def record_request(path: str, status_code: int, duration_ms: float) -> None:
        """Record a completed API request."""
        _request_count[f"{path}:{status_code}"] += 1
        latencies = _request_latency[path]
        latencies.append(duration_ms)
        if len(latencies) > MAX_LATENCY_SAMPLES:
            latencies.pop(0)

    @staticmethod
    def record_business_event(event: str, **tags: Any) -> None:
        """Record a business event (document uploaded, question asked, etc.)."""
        key = event
        for k, v in tags.items():
            key += f"|{k}={v}"
        _business_events[key] += 1

    @staticmethod
    def get_summary() -> dict[str, Any]:
        """Return a metrics summary for the health endpoint."""
        uptime = time.time() - _start_time

        latency_summary: dict[str, dict[str, float]] = {}
        for path, latencies in _request_latency.items():
            if latencies:
                sorted_lat = sorted(latencies)
                latency_summary[path] = {
                    "count": len(latencies),
                    "avg_ms": round(sum(latencies) / len(latencies), 2),
                    "p50_ms": round(sorted_lat[len(sorted_lat) // 2], 2),
                    "p95_ms": round(sorted_lat[int(len(sorted_lat) * 0.95)], 2),
                }

        return {
            "uptime_seconds": round(uptime, 1),
            "total_requests": sum(_request_count.values()),
            "request_counts": dict(_request_count),
            "latency": latency_summary,
            "business_events": dict(_business_events),
        }

    @staticmethod
    def reset() -> None:
        """Reset all metrics (for testing)."""
        _request_count.clear()
        _request_latency.clear()
        _business_events.clear()


metrics = Metrics()
