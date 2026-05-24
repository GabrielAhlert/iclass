import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Arquivo, Tarefa, Resolucao, TipoArquivo, Usuario, TipoUsuario
from app.schemas.arquivo import ArquivoRead
from app.core.deps import get_current_user, require_role

router = APIRouter()

UPLOAD_DIR = "/app/uploads"
MAX_SIZE_BYTES = 5 * 1024 * 1024  # 5 MB (RF 4.5)
TIPOS_PERMITIDOS = {
    "application/pdf": TipoArquivo.pdf,
    "image/jpeg": TipoArquivo.imagem,
    "image/png": TipoArquivo.imagem,
    "image/webp": TipoArquivo.imagem,
}


async def _salvar_arquivo(upload: UploadFile) -> tuple[str, str, int, TipoArquivo]:
    """Valida, salva e retorna (nome_original, url_relativa, tamanho, tipo)."""
    content_type = upload.content_type or ""
    if content_type not in TIPOS_PERMITIDOS:
        raise HTTPException(status_code=415, detail="Formato não permitido. Use PDF ou imagem (JPEG/PNG/WebP)")

    conteudo = await upload.read()
    if len(conteudo) > MAX_SIZE_BYTES:
        raise HTTPException(status_code=413, detail="Arquivo excede 5 MB")

    ext = "pdf" if content_type == "application/pdf" else upload.filename.rsplit(".", 1)[-1]
    nome_arquivo = f"{uuid.uuid4().hex}.{ext}"
    caminho = os.path.join(UPLOAD_DIR, nome_arquivo)

    with open(caminho, "wb") as f:
        f.write(conteudo)

    return upload.filename, f"/uploads/{nome_arquivo}", len(conteudo), TIPOS_PERMITIDOS[content_type]


@router.post("/tarefa/{tarefa_id}", response_model=ArquivoRead, status_code=status.HTTP_201_CREATED)
async def upload_para_tarefa(
    tarefa_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    """RF 4.4 — Professor anexa material à tarefa (PDF ou imagem, máx 5 MB)."""
    tarefa = await session.exec(select(Tarefa).where(Tarefa.id == tarefa_id))
    if not tarefa.first():
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    nome_original, url, tamanho, tipo = await _salvar_arquivo(file)
    arquivo = Arquivo(nome=nome_original, tipo=tipo, tamanho_bytes=tamanho, url=url, tarefa_id=tarefa_id)
    session.add(arquivo)
    await session.commit()
    await session.refresh(arquivo)
    return arquivo


@router.post("/resolucao/{resolucao_id}", response_model=ArquivoRead, status_code=status.HTTP_201_CREATED)
async def upload_para_resolucao(
    resolucao_id: int,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """RF 4.4 — Aluno anexa arquivo à sua resolução."""
    res_result = await session.exec(select(Resolucao).where(Resolucao.id == resolucao_id))
    resolucao = res_result.first()
    if not resolucao:
        raise HTTPException(status_code=404, detail="Resolução não encontrada")
    if current_user.tipo == TipoUsuario.aluno and resolucao.aluno_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")

    nome_original, url, tamanho, tipo = await _salvar_arquivo(file)
    arquivo = Arquivo(nome=nome_original, tipo=tipo, tamanho_bytes=tamanho, url=url, resolucao_id=resolucao_id)
    session.add(arquivo)
    await session.commit()
    await session.refresh(arquivo)
    return arquivo


@router.get("/tarefa/{tarefa_id}", response_model=list[ArquivoRead])
async def listar_arquivos_tarefa(
    tarefa_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Arquivo).where(Arquivo.tarefa_id == tarefa_id))
    return result.all()


@router.get("/resolucao/{resolucao_id}", response_model=list[ArquivoRead])
async def listar_arquivos_resolucao(
    resolucao_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Arquivo).where(Arquivo.resolucao_id == resolucao_id))
    return result.all()
