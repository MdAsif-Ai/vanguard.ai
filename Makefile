.PHONY: install up build down logs shell migrate migration seed init-qdrant \
	test test-integration lint format typecheck pull up-hub release

install:            ## Install the package with dev dependencies
	pip install -e ".[dev]"

up:                 ## Start the full stack with Docker Compose (build from source)
	docker compose up -d

build:              ## Build the application images
	docker compose build

down:               ## Stop the stack
	docker compose down

logs:               ## Tail logs from all services
	docker compose logs -f

shell:              ## Open a shell inside the API container
	docker compose exec api bash

migrate:            ## Apply all pending database migrations
	docker compose exec api alembic upgrade head

migration:          ## Create a new migration: make migration name="add table"
	docker compose exec api alembic revision -m "$(name)"

seed:               ## Create the default organization and admin user
	docker compose exec api python scripts/seed.py

init-qdrant:        ## Create the Qdrant collection (default vector size 1024)
	docker compose exec api python scripts/init_qdrant.py

test:               ## Run unit tests (no infrastructure required)
	pytest -m "not integration"

test-integration:   ## Run integration tests (requires `make up` and `make migrate`)
	DATABASE_URL=postgresql+psycopg://financerag:financerag@localhost:5432/financerag \
	REDIS_URL=redis://localhost:6379/0 \
	QDRANT_URL=http://localhost:6334 \
	STORAGE_PATH=/tmp/financerag-test-documents \
	pytest -m integration

lint:               ## Run ruff checks
	ruff check .

format:             ## Format the codebase
	ruff format .

typecheck:          ## Run mypy on the application
	mypy app

pull:               ## Pull published images (needs DOCKERHUB_USERNAME in .env)
	docker compose -f docker-compose.hub.yml pull

up-hub:             ## Run the stack from Docker Hub images
	docker compose -f docker-compose.hub.yml up -d

release:            ## Tag and push a release: make release VERSION=v0.2.0
	@if [ -z "$(VERSION)" ]; then \
	echo "Usage: make release VERSION=v0.2.0"; exit 1; fi
	git tag -a $(VERSION) -m "FinanceRAG $(VERSION)"
	git push origin $(VERSION)