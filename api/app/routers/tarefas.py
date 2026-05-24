from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Tarefa, TarefaAluno, TurmaAluno, Usuario, TipoUsuario, Resolucao, StatusResolucao
from app.schemas.tarefa import TarefaCreate, TarefaRead, TarefaUpdate
from app.core.deps import get_current_user, require_role

router = APIRouter()


async def _criar_resolucoes_para_turma(tarefa: Tarefa, session: AsyncSession):
    """Cria registros de resolução pendente para todos os alunos da turma."""
    alunos = await session.exec(select(TurmaAluno).where(TurmaAluno.turma_id == tarefa.turma_id))
    for matricula in alunos.all():
        res = Resolucao(tarefa_id=tarefa.id, aluno_id=matricula.aluno_id, status=StatusResolucao.pendente)
        session.add(res)


@router.post("/", response_model=TarefaRead, status_code=status.HTTP_201_CREATED)
async def criar_tarefa(
    data: TarefaCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    """RF 4.1 — Professor cria tarefa para turma ou alunos individuais."""
    tarefa = Tarefa(**data.model_dump(), professor_id=current_user.id)
    session.add(tarefa)
    await session.commit()
    await session.refresh(tarefa)

    if tarefa.turma_id:
        await _criar_resolucoes_para_turma(tarefa, session)
        await session.commit()

    return TarefaRead.from_tarefa(tarefa)


@router.get("/", response_model=list[TarefaRead])
async def listar_tarefas(
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(get_current_user),
):
    if current_user.tipo == TipoUsuario.professor:
        result = await session.exec(select(Tarefa).where(Tarefa.professor_id == current_user.id))
    elif current_user.tipo == TipoUsuario.aluno:
        # Tarefas das turmas do aluno
        matriculas = await session.exec(select(TurmaAluno).where(TurmaAluno.aluno_id == current_user.id))
        turma_ids = [m.turma_id for m in matriculas.all()]

        # Tarefas individuais do aluno
        individuais = await session.exec(select(TarefaAluno).where(TarefaAluno.aluno_id == current_user.id))
        tarefa_ids_individuais = [t.tarefa_id for t in individuais.all()]

        result = await session.exec(
            select(Tarefa).where(
                (Tarefa.turma_id.in_(turma_ids)) | (Tarefa.id.in_(tarefa_ids_individuais))
            )
        )
    else:
        result = await session.exec(select(Tarefa))

    return [TarefaRead.from_tarefa(t) for t in result.all()]


@router.get("/{tarefa_id}", response_model=TarefaRead)
async def get_tarefa(
    tarefa_id: int,
    session: AsyncSession = Depends(get_session),
    _: Usuario = Depends(get_current_user),
):
    result = await session.exec(select(Tarefa).where(Tarefa.id == tarefa_id))
    tarefa = result.first()
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    return TarefaRead.from_tarefa(tarefa)


@router.patch("/{tarefa_id}", response_model=TarefaRead)
async def atualizar_tarefa(
    tarefa_id: int,
    data: TarefaUpdate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    result = await session.exec(select(Tarefa).where(Tarefa.id == tarefa_id))
    tarefa = result.first()
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    if tarefa.professor_id != current_user.id and current_user.tipo != TipoUsuario.admin:
        raise HTTPException(status_code=403, detail="Não é sua tarefa")

    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(tarefa, campo, valor)

    session.add(tarefa)
    await session.commit()
    await session.refresh(tarefa)
    return TarefaRead.from_tarefa(tarefa)


@router.delete("/{tarefa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remover_tarefa(
    tarefa_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    result = await session.exec(select(Tarefa).where(Tarefa.id == tarefa_id))
    tarefa = result.first()
    if not tarefa:
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")
    if tarefa.professor_id != current_user.id and current_user.tipo != TipoUsuario.admin:
        raise HTTPException(status_code=403, detail="Não é sua tarefa")
    await session.delete(tarefa)
    await session.commit()


@router.post("/{tarefa_id}/alunos/{aluno_id}", status_code=status.HTTP_201_CREATED)
async def atribuir_aluno(
    tarefa_id: int,
    aluno_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    """RF 4.1 — Atribuir tarefa individual a um aluno."""
    tarefa = await session.exec(select(Tarefa).where(Tarefa.id == tarefa_id))
    if not tarefa.first():
        raise HTTPException(status_code=404, detail="Tarefa não encontrada")

    aluno = await session.exec(select(Usuario).where(Usuario.id == aluno_id, Usuario.tipo == TipoUsuario.aluno))
    if not aluno.first():
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    dup = await session.exec(select(TarefaAluno).where(
        TarefaAluno.tarefa_id == tarefa_id, TarefaAluno.aluno_id == aluno_id
    ))
    if dup.first():
        raise HTTPException(status_code=409, detail="Tarefa já atribuída a este aluno")

    ta = TarefaAluno(tarefa_id=tarefa_id, aluno_id=aluno_id)
    res = Resolucao(tarefa_id=tarefa_id, aluno_id=aluno_id, status=StatusResolucao.pendente)
    session.add(ta)
    session.add(res)
    await session.commit()
    return {"detail": "Tarefa atribuída"}
