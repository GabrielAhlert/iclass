from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Avaliacao, Resolucao, Tarefa, StatusResolucao, Usuario, TipoUsuario
from app.schemas.avaliacao import AvaliacaoCreate, AvaliacaoRead, AvaliacaoUpdate
from app.core.deps import get_current_user, require_role, is_admin, is_professor, is_aluno

router = APIRouter()


async def _tarefa_da_resolucao(session: AsyncSession, resolucao: Resolucao) -> Tarefa | None:
    result = await session.exec(select(Tarefa).where(Tarefa.id == resolucao.tarefa_id))
    return result.first()


@router.post("/", response_model=AvaliacaoRead, status_code=status.HTTP_201_CREATED)
async def criar_avaliacao(
    data: AvaliacaoCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    """Professor avalia a resolução de um aluno."""
    res_result = await session.exec(select(Resolucao).where(Resolucao.id == data.resolucao_id))
    resolucao = res_result.first()
    if not resolucao:
        raise HTTPException(status_code=404, detail="Resolução não encontrada")

    if not is_admin(current_user):
        tarefa = await _tarefa_da_resolucao(session, resolucao)
        if not tarefa or tarefa.professor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Não é sua tarefa")

    dup = await session.exec(select(Avaliacao).where(Avaliacao.resolucao_id == data.resolucao_id))
    if dup.first():
        raise HTTPException(status_code=409, detail="Resolução já foi avaliada")

    avaliacao = Avaliacao(**data.model_dump(), professor_id=current_user.id)
    session.add(avaliacao)

    # Atualiza status da resolução
    resolucao.status = StatusResolucao.avaliada
    session.add(resolucao)

    await session.commit()
    await session.refresh(avaliacao)
    return avaliacao


@router.get("/", response_model=list[AvaliacaoRead])
async def listar_avaliacoes(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    if is_aluno(current_user):
        # Aluno vê suas avaliações via resolucoes
        resolucoes = await session.exec(
            select(Resolucao).where(Resolucao.aluno_id == current_user.id)
        )
        ids = [r.id for r in resolucoes.all()]
        result = await session.exec(select(Avaliacao).where(Avaliacao.resolucao_id.in_(ids)))
    elif is_professor(current_user):
        result = await session.exec(
            select(Avaliacao)
            .join(Resolucao, Resolucao.id == Avaliacao.resolucao_id)
            .join(Tarefa, Tarefa.id == Resolucao.tarefa_id)
            .where(Tarefa.professor_id == current_user.id)
        )
    else:
        result = await session.exec(select(Avaliacao))
    return result.all()


@router.get("/{avaliacao_id}", response_model=AvaliacaoRead)
async def get_avaliacao(
    avaliacao_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Avaliacao).where(Avaliacao.id == avaliacao_id))
    avaliacao = result.first()
    if not avaliacao:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")
    if is_admin(current_user):
        return avaliacao
    res_result = await session.exec(select(Resolucao).where(Resolucao.id == avaliacao.resolucao_id))
    resolucao = res_result.first()
    if not resolucao:
        raise HTTPException(status_code=403, detail="Sem permissão")
    if is_aluno(current_user):
        if resolucao.aluno_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return avaliacao
    if is_professor(current_user):
        tarefa = await _tarefa_da_resolucao(session, resolucao)
        if not tarefa or tarefa.professor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Sem permissão")
        return avaliacao
    raise HTTPException(status_code=403, detail="Sem permissão")


@router.patch("/{avaliacao_id}", response_model=AvaliacaoRead)
async def atualizar_avaliacao(
    avaliacao_id: int,
    data: AvaliacaoUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    result = await session.exec(select(Avaliacao).where(Avaliacao.id == avaliacao_id))
    avaliacao = result.first()
    if not avaliacao:
        raise HTTPException(status_code=404, detail="Avaliação não encontrada")

    if not is_admin(current_user):
        res_result = await session.exec(select(Resolucao).where(Resolucao.id == avaliacao.resolucao_id))
        resolucao = res_result.first()
        if not resolucao:
            raise HTTPException(status_code=403, detail="Sem permissão")
        tarefa = await _tarefa_da_resolucao(session, resolucao)
        if not tarefa or tarefa.professor_id != current_user.id:
            raise HTTPException(status_code=403, detail="Não é sua tarefa")

    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(avaliacao, campo, valor)

    session.add(avaliacao)
    await session.commit()
    await session.refresh(avaliacao)
    return avaliacao
