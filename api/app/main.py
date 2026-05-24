from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.db import init_db
from app.routers import auth, usuarios, turmas, tarefas, resolucoes, avaliacoes, arquivos

UPLOAD_DIR = "/app/uploads"
if not os.path.isdir(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="iClass API",
    description="Plataforma educacional MVP — FastAPI + PostgreSQL",
    version="0.2.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

app.include_router(auth.router,        prefix="/api/v1/auth",        tags=["auth"])
app.include_router(usuarios.router,    prefix="/api/v1/usuarios",    tags=["usuarios"])
app.include_router(turmas.router,      prefix="/api/v1/turmas",      tags=["turmas"])
app.include_router(tarefas.router,     prefix="/api/v1/tarefas",     tags=["tarefas"])
app.include_router(resolucoes.router,  prefix="/api/v1/resolucoes",  tags=["resolucoes"])
app.include_router(avaliacoes.router,  prefix="/api/v1/avaliacoes",  tags=["avaliacoes"])
app.include_router(arquivos.router,    prefix="/api/v1/arquivos",    tags=["arquivos"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "iclass-api", "version": "0.2.0"}
