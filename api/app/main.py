from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import init_db
from app.routers import auth, users, tasks, evaluations


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="iClass API",
    description="Plataforma educacional MVP — FastAPI + PostgreSQL",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,        prefix="/api/v1/auth",        tags=["auth"])
app.include_router(users.router,       prefix="/api/v1/users",       tags=["users"])
app.include_router(tasks.router,       prefix="/api/v1/tasks",       tags=["tasks"])
app.include_router(evaluations.router, prefix="/api/v1/evaluations", tags=["evaluations"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "iclass-api"}
