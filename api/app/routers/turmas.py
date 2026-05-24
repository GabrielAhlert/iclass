from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Turma, TurmaAluno, Usuario, TipoUsuario
from app.schemas.turma import TurmaCreate, TurmaRead, TurmaUpdate, TurmaAlunoRead
from app.core.deps import get_current_user, require_role, is_admin, is_professor, is_aluno, aluno_matriculado

router = APIRouter()


@router.post("/", response_model=TurmaRead, status_code=status.HTTP_201_CREATED)
async def criar_turma(
    data: TurmaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.1 / RF 3.3 — Admin ou professor criam turma."""
    dup = await session.exec(select(Turma).where(Turma.codigo_identificador == data.codigo_identificador))
    if dup.first():
        raise HTTPException(status_code=409, detail="Código identificador já existe")

    professor_id = current_user.id if is_professor(current_user) else data.professor_id

    prof = await session.exec(select(Usuario).where(Usuario.id == professor_id, Usuario.tipo == TipoUsuario.professor))
    if not prof.first():
        raise HTTPException(status_code=404, detail="Professor não encontrado")

    payload = data.model_dump()
    payload["professor_id"] = professor_id
    turma = Turma(**payload)
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


async def _carregar_turma_autorizada(
    turma_id: int,
    session: AsyncSession,
    current_user: Usuario,
    *,
    apenas_dono: bool = False,
) -> Turma:
    """Carrega turma e valida acesso. apenas_dono=True bloqueia aluno e exige professor=dono."""
    result = await session.exec(select(Turma).where(Turma.id == turma_id))
    turma = result.first()
    if not turma:
        raise HTTPException(status_code=404, detail="Turma não encontrada")
    if is_admin(current_user):
        return turma
    if apenas_dono:
        if is_professor(current_user) and turma.professor_id == current_user.id:
            return turma
        raise HTTPException(status_code=403, detail="Sem permissão")
    if is_professor(current_user):
        if turma.professor_id == current_user.id:
            return turma
    elif is_aluno(current_user):
        if await aluno_matriculado(session, current_user.id, turma.id):
            return turma
    raise HTTPException(status_code=403, detail="Sem permissão")


@router.get("/{turma_id}", response_model=TurmaRead)
async def get_turma(
    turma_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    return await _carregar_turma_autorizada(turma_id, session, current_user)


@router.patch("/{turma_id}", response_model=TurmaRead)
async def atualizar_turma(
    turma_id: int,
    data: TurmaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    turma = await _carregar_turma_autorizada(turma_id, session, current_user, apenas_dono=True)

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
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    turma = await _carregar_turma_autorizada(turma_id, session, current_user, apenas_dono=True)
    await session.delete(turma)
    await session.commit()


@router.post("/{turma_id}/alunos/{aluno_id}", response_model=TurmaAlunoRead, status_code=status.HTTP_201_CREATED)
async def adicionar_aluno(
    turma_id: int,
    aluno_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.6 — Adicionar aluno à turma."""
    await _carregar_turma_autorizada(turma_id, session, current_user, apenas_dono=True)

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
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    """RF 3.6 — Remover aluno da turma."""
    await _carregar_turma_autorizada(turma_id, session, current_user, apenas_dono=True)
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
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    await _carregar_turma_autorizada(turma_id, session, current_user, apenas_dono=True)
    result = await session.exec(select(TurmaAluno).where(TurmaAluno.turma_id == turma_id))
    return result.all()
