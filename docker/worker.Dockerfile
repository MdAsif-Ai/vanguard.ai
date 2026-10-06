# FinanceRAG Celery worker image (carries the ingestion ML stack).
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/data/models

WORKDIR /app

# System libraries required by OpenCV (docling's table-structure and OCR
# models). python:3.12-slim does not ship the X11/GL libraries cv2 needs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libgl1 \
        libxcb1 \
        libxext6 \
        libsm6 \
    && rm -rf /var/lib/apt/lists/*

# The ingest extra pulls docling + sentence-transformers + torch (~2.5 GB).
# Model WEIGHTS are never baked into the image; they download at first use
# into /data/models (a named volume).
COPY pyproject.toml README.md LICENSE ./
COPY app ./app
RUN pip install --no-cache-dir --timeout 120 --retries 10 .[ingest]

# Pre-download the RapidOCR models (docling's OCR engine) as root during
# build. RapidOCR stores models inside site-packages, which is read-only
# for the non-root runtime user; baking them here avoids the runtime
# download permission error.
RUN python -c "import pathlib, rapidocr; p = pathlib.Path(rapidocr.__file__).parent / 'models'; p.mkdir(parents=True, exist_ok=True); p.chmod(0o777); print('RapidOCR models dir ready')"

RUN useradd --create-home --uid 1000 financerag \
    && mkdir -p /data/documents /data/models \
    && chown -R financerag:financerag /data/documents /data/models
USER financerag

CMD ["celery", "-A", "app.workers.celery_app", "worker", "--loglevel=INFO", "--concurrency=2"]