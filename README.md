# Guimintlab Studio

Visual editor for embedded UI projects.

## Monorepo layout

```text
guimintlab-studio/
├── docker-compose.yml       Local dev stack with PostgreSQL
├── docker-compose.prod.yml  Production API stack with external PostgreSQL
├── apps/
│   ├── web/        Vite + React + TypeScript frontend
│   └── api/        FastAPI backend (Python 3.14 + uv)
└── package.json             Root scripts
```

## Prerequisites

- Node.js 20+ and npm
- Docker Desktop (for running the API and PostgreSQL locally)

## Quick start

```bash
git clone <repo>
cd guimintlab-studio
cp .env.example .env
npm install
npm --prefix apps/web install
```

### Mode A — Fast dev (recommended on macOS)

API and PostgreSQL run in Docker, web runs natively (sub-100ms HMR).

```bash
npm run dev:docker   # terminal 1 — API at http://localhost:58008, PostgreSQL at localhost:55432
npm run dev:web      # terminal 2 — web at http://localhost:5173
```

For Mode A, keep `VITE_API_URL=http://localhost:58008` in `.env`.

### Mode B — Full Docker

API, web and PostgreSQL all run in containers. One command for everything — useful for onboarding or if you prefer container isolation.
The web container keeps its own Linux `node_modules` in a Docker volume, so it
does not reuse macOS dependencies from your host.

```bash
npm run dev:docker:full
```

Open the web app at <http://localhost:58009>. The API is available at
<http://localhost:58008> (Swagger at `/docs`).

> On macOS, file watching across the Docker virtualization layer requires polling, which has noticeable HMR latency. If that bothers you, switch to Mode A or use [OrbStack](https://orbstack.dev/) instead of Docker Desktop.

### Stop everything

```bash
npm run down
```

## Stack

- **Frontend**: React 18, Vite, Vitest, Zustand, custom UI primitives
- **Backend**: FastAPI, SQLAlchemy 2.0 async, Alembic
- **Database**: PostgreSQL
- **Auth**: Bearer JWT verification
- **Deploy**: Dokploy (Docker)

---

## API app (apps/api)

FastAPI backend for Guimintlab Studio. It verifies bearer JWTs and talks to
PostgreSQL via SQLAlchemy.

### API Structure

- `apps/api/src/guimintlab_api/main.py` — app factory, CORS, router registration.
- `apps/api/src/guimintlab_api/auth.py` — bearer JWT verification.
- `apps/api/src/guimintlab_api/db.py` — async SQLAlchemy engine and session.
- `apps/api/src/guimintlab_api/routers/` — API endpoints.
- `apps/api/src/guimintlab_api/models/` — SQLAlchemy models.
- `apps/api/src/guimintlab_api/schemas/` — Pydantic DTOs.
- `apps/api/alembic/` — database migrations.

### API Commands

```bash
npm run dev:docker   # API in Docker at http://localhost:58008

cd apps/api
uv sync
uv run uvicorn guimintlab_api.main:app --reload --host 0.0.0.0 --port 8000
uv run pytest
```

### Migrations

```bash
cd apps/api
uv run alembic revision --autogenerate -m "describe change"
uv run alembic upgrade head
```

Docker Compose publishes the API at <http://localhost:58008>; Swagger is
available at `/docs`.

### Production Compose

Production does not start a database container. Provide `DATABASE_URL` for an
external PostgreSQL instance and run the production compose file:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## Web app (apps/web)

Studio operates on the canonical IR defined in `apps/web/src/ui-ir/`.
There is **no separate editor model**: the editor store is a direct view
over the `UiProject → ScreenNode → WidgetNode` tree.

### What lives here

FSD-inspired layout. Dependency direction is `app → pages → widgets → entities → shared`.

- `apps/web/src/app/` — root composition (providers, view switching, global styles).
- `apps/web/src/pages/library/` — project library screen (cards, create/edit/delete modals).
- `apps/web/src/pages/editor/` — editor screen shell + keyboard shortcuts.
- `apps/web/src/widgets/tree-panel/` — widget tree panel.
- `apps/web/src/widgets/canvas-workspace/` — canvas workspace + preview renderer (rulers, selection overlay, pure geometry helpers).
- `apps/web/src/widgets/properties-panel/` — property inspector (per-type groups + shared inspector controls).
- `apps/web/src/widgets/export-panel/` — IR export + C codegen UI.
- `apps/web/src/entities/ui-project/` — canonical IR (`schema`, `types`, `validate`, `defaults`, `ids`), Zustand store (`model/store`), tree ops (`model/tree-ops`), undo/redo (`model/history`), shared layout semantics (`lib/layoutEngine`, `lib/color`), starter projects (`samples/`).
- `apps/web/src/entities/icon/` — icon library + sizing helpers.
- `apps/web/src/entities/font/` — bitmap font library + `BitmapText` renderer.
- `apps/web/src/shared/ui/` — generic UI primitives (IconButton, CustomSelect, DraftNumberInput).
- `apps/web/src/shared/config/` — display presets and other configuration data.
- `apps/web/src/shared/assets/` — logo, font sources.

Imports use `@app`, `@pages`, `@widgets`, `@entities`, `@shared` aliases — see `apps/web/vite.config.ts` and `apps/web/tsconfig.json`.

### Commands

```bash
npm run dev:web      # Vite prints the local dev server URL
npm run build:web    # production build
npm run test:web     # vitest run
```

### Boundaries

Studio must NOT:

- Own its own layer/element model.
- Emit raw draw calls — codegen lives in `guimintlab-core`.
- Know about SPI/DMA/ESP-IDF.

Studio MUST:

- Speak IR only.
- Round-trip any project it opens without losing ids.
- Share layout semantics with the runtime (any divergence is a bug).

See [`guimintlab-core/docs/boundaries.md`](../guimintlab-core/docs/boundaries.md).
