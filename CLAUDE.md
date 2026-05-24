# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**iClass** is an educational platform MVP that combines Moodle-style material management with a simple to-do list UX.

## Architecture

Three-layer monorepo, orchestrated via Docker Compose:

| Layer | Tech | Directory |
|-------|------|-----------|
| API | Python / FastAPI + SQLModel + PostgreSQL | `/api` |
| TUI Client | Rust / Ratatui + Crossterm + Reqwest | `/tui` |
| Infra | Docker Compose + PostgreSQL 16 | `/` |

## Common Commands

```bash
# Start all services
docker compose up --build

# Start only the database and API (no TUI)
docker compose up db api

# Run API in watch mode (inside container)
docker compose exec api uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run database migrations
docker compose exec api alembic upgrade head

# Run API tests
docker compose exec api pytest

# Build and run the TUI locally (requires Rust toolchain)
cd tui && cargo run

# Build TUI release binary
cd tui && cargo build --release
```

## Business Rules

- **Roles**: `student`, `teacher`, `admin`
- **Task weights**: Follow the Fibonacci sequence (1, 1, 2, 3, 5, 8, 13…)
- **Evaluation has two dimensions**:
  - `grade` — quality of work (0–10)
  - `participation` — engagement/punctuality (0–10)

## Backend (`/api`)

- **Framework**: FastAPI with SQLModel (combines SQLAlchemy + Pydantic)
- **Database**: PostgreSQL via asyncpg; migrations managed by Alembic
- **Entry point**: `api/app/main.py`
- **Structure**: `app/models/`, `app/routers/`, `app/schemas/`, `app/db.py`
- API is REST; all routes are versioned under `/api/v1/`

## Frontend (`/tui`)

- **Framework**: Ratatui (terminal UI) + Crossterm (cross-platform input)
- **HTTP client**: Reqwest (async, with tokio runtime)
- **Entry point**: `tui/src/main.rs`
- The TUI communicates with the API exclusively via HTTP (no direct DB access)

## Environment Variables

Defined in `.env` (not committed). Key vars:

```
DATABASE_URL=postgresql+asyncpg://iclass:iclass@db:5432/iclass
SECRET_KEY=changeme
API_BASE_URL=http://api:8000
```
