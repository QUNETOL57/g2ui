# --- Makefile for G2UI (Node web + FastAPI + PostgreSQL) ---
# Usage: make [target]

SHELL := bash
.ONESHELL:
.SHELLFLAGS := -eu -o pipefail -c
.DELETE_ON_ERROR:
MAKEFLAGS += --warn-undefined-variables
MAKEFLAGS += --no-builtin-rules

# --- Project ---
PROJECT  ?= $(shell node -p "require('./package.json').name" 2>/dev/null || basename $(CURDIR))
NODE_ENV ?= development
WEB_DIR  ?= apps/web
API_DIR  ?= apps/api

# --- Git ---
VERSION    ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo "dev")
COMMIT     ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_TIME := $(shell date -u '+%Y-%m-%dT%H:%M:%SZ')

# --- Python / uv ---
PY ?= uv
RUN ?= uv run

# ============================================================================
.DEFAULT_GOAL := help

##@ Development

.PHONY: install
install: ## Install dependencies (root + web)
	npm install
	npm --prefix $(WEB_DIR) install

.PHONY: dev_web
dev_web: ## Start web dev server (Vite, HMR)
	npm run dev_web

.PHONY: dev_api
dev_api: ## Start API + PostgreSQL in Docker
	npm run dev_api

.PHONY: dev
dev: ## Start full Docker stack (API + web + PostgreSQL)
	npm run dev:docker:full

.PHONY: gen_types
gen_types: ## Generate TS types from OpenAPI schema
	npm run gen_types

##@ Testing

.PHONY: test_web
test_web: ## Run web unit/feature tests (Vitest)
	npm run test_web

.PHONY: test_web_watch
test_web_watch: ## Run web tests in watch mode
	npm --prefix $(WEB_DIR) run test:watch

.PHONY: test_e2e
test_e2e: ## Run e2e tests (Playwright)
	npm run test_e2e

.PHONY: test_api
test_api: ## Run API tests (pytest)
	cd $(API_DIR) && $(RUN) pytest

.PHONY: test
test: test_web test_api ## Run all automated tests

##@ Code Quality

.PHONY: lint
lint: ## Run web lint + ruff lint for API
	npm run lint:web
	cd $(API_DIR) && $(RUN) ruff check .

.PHONY: lint_fix
lint_fix: ## Auto-fix lint issues (web ESLint + API ruff)
	npm --prefix $(WEB_DIR) run lint -- --fix
	cd $(API_DIR) && $(RUN) ruff check --fix .

.PHONY: typecheck
typecheck: ## Type-check web (tsc) and API (mypy)
	cd $(WEB_DIR) && npx tsc --noEmit -p tsconfig.json && npx tsc --noEmit -p tsconfig.node.json
	cd $(API_DIR) && $(RUN) mypy

.PHONY: fmt
fmt: ## Format code (API ruff format)
	cd $(API_DIR) && $(RUN) ruff format .

.PHONY: check
check: lint typecheck test ## Run all quality checks

##@ Database / Migrations

.PHONY: db_migrate
db_migrate: ## Run Alembic migrations (API in Docker)
	cd $(API_DIR) && $(RUN) alembic upgrade head

.PHONY: db_revision
db_revision: ## Create a new Alembic migration (use MSG="describe change")
	cd $(API_DIR) && $(RUN) alembic revision --autogenerate -m "$(MSG)"

##@ Docker

.PHONY: docker_dev
docker_dev: ## Start dev Docker stack (API + PostgreSQL)
	npm run dev:docker

.PHONY: docker_dev_build
docker_dev_build: ## Rebuild dev containers
	npm run dev:docker:build

.PHONY: docker_down
docker_down: ## Stop Docker stack and remove volumes
	npm run down

.PHONY: docker_prod_build
docker_prod_build: ## Build production API image
	docker compose -f docker-compose.prod.yml build

.PHONY: docker_prod_up
docker_prod_up: ## Start production API (external PostgreSQL)
	docker compose -f docker-compose.prod.yml up -d --build

##@ Build

.PHONY: build
build: ## Build web for production
	npm run build:web

.PHONY: build_bundle
build_bundle: ## Build web bundle only (no typecheck)
	npm --prefix $(WEB_DIR) run build_bundle

##@ CI

.PHONY: ci
ci: install lint typecheck test build ## Run full CI pipeline

##@ Cleanup

.PHONY: clean
clean: ## Remove build artifacts and caches
	rm -rf $(WEB_DIR)/dist $(WEB_DIR)/coverage $(WEB_DIR)/test-results
	rm -rf .pytest_cache $(API_DIR)/.pytest_cache $(API_DIR)/.ruff_cache

.PHONY: clean-all
clean-all: clean ## Remove everything including node_modules
	rm -rf node_modules/ $(WEB_DIR)/node_modules

##@ Help

.PHONY: help
help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "Usage:\n  make \033[36m<target>\033[0m\n"} \
		/^[a-zA-Z0-9:_-]+:.*?## / {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2} \
		/^##@/ {printf "\n\033[1m%s\033[0m\n", substr($$0, 5)}' $(MAKEFILE_LIST)
