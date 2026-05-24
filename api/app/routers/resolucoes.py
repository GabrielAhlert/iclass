from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Resolucao, Tarefa, Usuario, TipoUsuario, StatusResolucao
from app.schemas.resolucao import ResolucaoCreate, ResolucaoRead, ResolucaoUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.post("/", response_model=ResolucaoRead, status_code=status.HTTP_201_CREATED)
async def entregar_resolucao(
    data: ResolucaoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    """Aluno entrega uma tarefa criando ou atualizando sua resolução."""
    if current_user.tipo != TipoUsuario.aluno:
        raise HTTPException(status_code=403, detail="Apenas alunos entregam resoluções")

    tarefa_result = await session.exec(select(Tarefa).where(Tarefa.id == data.tarefa_id))
    tarefa = tarefa_result.first()
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    # Verifica se já existe resolução pendente criada automaticamente
    existing = await session.exec(
        select(Resolucao).where(
            Resolucao.tarefa_id == data.tarefa_id,
            Resolucao.aluno_id == current_user.id,
        )
    )
    resolucao = existing.first()

    agora = datetime.now(timezone.utc)
    status_entrega = StatusResolucao.entregue

    # RF 4.2 — verifica prazo
    if tarefa.prazo_fixo and tarefa.data_limite:
        dl = tarefa.data_limite
        if dl.tzinfo is None:
            dl = dl.replace(tzinfo=timezone.utc)
        if agora > dl:
            status_entrega = StatusResolucao.atrasada

    if resolucao:
        resolucao.data_entrega = agora
        resolucao.status = status_entrega
        session.add(resolucao)
    else:
        resolucao = Resolucao(
            tarefa_id=data.tarefa_id,
            aluno_id=current_user.id,
            data_entrega=agora,
            status=status_entrega,
        )
        session.add(resolucao)

    await session.commit()
    await session.refresh(resolucao)
    return resolucao


@router.get("/", response_model=list[ResolucaoRead])
async def listar_resolucoes(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.tipo == TipoUsuario.aluno:
        result = await session.exec(
            select(Resolucao).where(Resolucao.aluno_id == current_user.id)
        )
    else:
        result = await session.exec(select(Resolucao))
    return result.all()


@router.get("/{resolucao_id}", response_model=ResolucaoRead)
async def get_resolucao(
    resolucao_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Resolucao).where(Resolucao.id == resolucao_id))
    resolucao = result.first()
    if not resolucao:
        raise HTTPException(status_code=404, detail="Resolução não encontrada")
    if current_user.tipo == TipoUsuario.aluno and resolucao.aluno_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    return resolucao


@router.get("/tarefa/{tarefa_id}", response_model=list[ResolucaoRead])
async def resolucoes_por_tarefa(
    tarefa_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    """Professor visualiza todas as resoluções de uma tarefa."""
    result = await session.exec(select(Resolucao).where(Resolucao.tarefa_id == tarefa_id))
    return result.all()
