from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
import os

from app.db import init_db, get_session
from app.models import Usuario, Arquivo, Tarefa, Resolucao
from app.core.deps import get_current_user, is_admin, is_professor, is_aluno, aluno_pode_ver_tarefa
from app.routers import auth, usuarios, turmas, tarefas, resolucoes, avaliacoes, arquivos, responsaveis

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
app.include_router(responsaveis.router, prefix="/api/v1/responsaveis", tags=["responsaveis"])


@app.get("/health", tags=["health"])
async def health():
    return {"status": "ok", "service": "iclass-api", "version": "0.2.0"}


@app.get("/uploads/{filename}", tags=["uploads"])
async def download_upload(
    filename: str,
    current_user: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    if "/" in filename or "\\" in filename or filename.startswith("."):
        raise HTTPException(status_code=400, detail="Nome inválido")
    caminho = os.path.join(UPLOAD_DIR, filename)
    if not os.path.isfile(caminho):
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    arquivo_result = await session.exec(select(Arquivo).where(Arquivo.url == f"/uploads/{filename}"))
    arquivo = arquivo_result.first()
    if not arquivo:
        raise HTTPException(status_code=404, detail="Arquivo não encontrado")

    if is_admin(current_user):
        return FileResponse(caminho)

    if arquivo.tarefa_id is not None:
        tarefa_result = await session.exec(select(Tarefa).where(Tarefa.id == arquivo.tarefa_id))
        tarefa = tarefa_result.first()
        if not tarefa:
            raise HTTPException(status_code=403, detail="Sem permissão")
        if is_professor(current_user) and tarefa.professor_id == current_user.id:
            return FileResponse(caminho)
        if is_aluno(current_user) and await aluno_pode_ver_tarefa(session, current_user, tarefa):
            return FileResponse(caminho)
        raise HTTPException(status_code=403, detail="Sem permissão")

    if arquivo.resolucao_id is not None:
        res_result = await session.exec(select(Resolucao).where(Resolucao.id == arquivo.resolucao_id))
        resolucao = res_result.first()
        if not resolucao:
            raise HTTPException(status_code=403, detail="Sem permissão")
        if is_aluno(current_user) and resolucao.aluno_id == current_user.id:
            return FileResponse(caminho)
        if is_professor(current_user):
            tarefa_result = await session.exec(select(Tarefa).where(Tarefa.id == resolucao.tarefa_id))
            tarefa = tarefa_result.first()
            if tarefa and tarefa.professor_id == current_user.id:
                return FileResponse(caminho)
        raise HTTPException(status_code=403, detail="Sem permissão")

    raise HTTPException(status_code=403, detail="Sem permissão")
