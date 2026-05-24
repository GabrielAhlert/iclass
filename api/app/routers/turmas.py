from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Turma, TurmaAluno, Usuario, TipoUsuario
from app.schemas.turma import TurmaCreate, TurmaRead, TurmaUpdate, TurmaAlunoRead
from app.core.deps import get_current_user, require_role

router = APIRouter()


@router.post("/", response_model=TurmaRead, status_code=status.HTTP_201_CREATED)
async def criar_turma(
    data: TurmaCreate,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.1 / RF 3.3 — Admin ou professor criam turma."""
    dup = await session.exec(select(Turma).where(Turma.codigo_identificador == data.codigo_identificador))
    if dup.first():
        raise HTTPException(status_code=409, detail="Código identificador já existe")

    prof = await session.exec(select(Usuario).where(Usuario.id == data.professor_id, Usuario.tipo == TipoUsuario.professor))
    if not prof.first():
        raise HTTPException(status_code=404, detail="Professor não encontrado")

    turma = Turma(**data.model_dump())
    session.add(turma)
    await session.commit()
    await session.refresh(turma)
    return turma


@router.get("/", response_model=list[TurmaRead])
async def listar_turmas(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.tipo == TipoUsuario.professor:
        result = await session.exec(select(Turma).where(Turma.professor_id == current_user.id))
    elif current_user.tipo == TipoUsuario.aluno:
        # Aluno só vê suas turmas
        matriculas = await session.exec(
            select(TurmaAluno).where(TurmaAluno.aluno_id == current_user.id)
        )
        turma_ids = [m.turma_id for m in matriculas.all()]
        result = await session.exec(select(Turma).where(Turma.id.in_(turma_ids)))
    else:
        result = await session.exec(select(Turma))
    return result.all()


@router.get("/{turma_id}", response_model=TurmaRead)
async def get_turma(
    turma_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Turma).where(Turma.id == turma_id))
    turma = result.first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    return turma


@router.patch("/{turma_id}", response_model=TurmaRead)
async def atualizar_turma(
    turma_id: int,
    data: TurmaUpdate,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    result = await session.exec(select(Turma).where(Turma.id == turma_id))
    turma = result.first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(turma, campo, valor)

    session.add(turma)
    await session.commit()
    await session.refresh(turma)
    return turma


@router.delete("/{turma_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_turma(
    turma_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    result = await session.exec(select(Turma).where(Turma.id == turma_id))
    turma = result.first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    await session.delete(turma)
    await session.commit()


@router.post("/{turma_id}/alunos/{aluno_id}", response_model=TurmaAlunoRead, status_code=status.HTTP_201_CREATED)
async def adicionar_aluno(
    turma_id: int,
    aluno_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.6 — Adicionar aluno à turma."""
    turma = await session.exec(select(Turma).where(Turma.id == turma_id))
    if not turma.first():
        raise HTTPException(status_code=404, detail="Turma não encontrada")

    aluno = await session.exec(select(Usuario).where(Usuario.id == aluno_id, Usuario.tipo == TipoUsuario.aluno))
    if not aluno.first():
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    dup = await session.exec(
        select(TurmaAluno).where(TurmaAluno.turma_id == turma_id, TurmaAluno.aluno_id == aluno_id)
    )
    if dup.first():
        raise HTTPException(status_code=409, detail="Aluno já matriculado nesta turma")

    matricula = TurmaAluno(turma_id=turma_id, aluno_id=aluno_id)
    session.add(matricula)
    await session.commit()
    await session.refresh(matricula)
    return matricula


@router.delete("/{turma_id}/alunos/{aluno_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_aluno(
    turma_id: int,
    aluno_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.6 — Remover aluno da turma."""
    result = await session.exec(
        select(TurmaAluno).where(TurmaAluno.turma_id == turma_id, TurmaAluno.aluno_id == aluno_id)
    )
    matricula = result.first()
    if not matricula:
        raise HTTPException(status_code=404, detail="Matrícula não encontrada")

    await session.delete(matricula)
    await session.commit()


@router.get("/{turma_id}/alunos", response_model=list[TurmaAlunoRead])
async def listar_alunos_turma(
    turma_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    result = await session.exec(select(TurmaAluno).where(TurmaAluno.turma_id == turma_id))
    return result.all()
