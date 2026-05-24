from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import os

from app.db import init_db
from app.models import Usuario
from app.core.deps import get_current_user
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
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/uploads/{filename}", tags=["uploads"])
async def download_upload(filename: str, _: Usuario = Depends(get_current_user)):
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=400, detail="Nome inválido")
    caminho = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(caminho):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")
    return FileResponse(caminho)
