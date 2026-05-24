from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from jose import JWTError

from app.db import get_session
from app.models import Usuario, TipoUsuario, TurmaAluno, TarefaAluno, Tarefa
from app.core.security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session),
) -> Usuario:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciais inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await session.exec(select(Usuario).where(Usuario.id == int(user_id)))
    usuario = result.first()
    if usuario is None or not usuario.is_active:
        raise credentials_exc
    return usuario


def require_role(*tipos: TipoUsuario):
    def _check(current_user: Usuario = Depends(get_current_user)) -> Usuario:
        if current_user.tipo not in tipos:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Permissão insuficiente",
            )
        return current_user
    return _check


def is_admin(u: Usuario) -> bool:
    return u.tipo == TipoUsuario.admin


def is_professor(u: Usuario) -> bool:
    return u.tipo == TipoUsuario.professor


def is_aluno(u: Usuario) -> bool:
    return u.tipo == TipoUsuario.aluno


async def aluno_matriculado(session: AsyncSession, aluno_id: int, turma_id: int) -> bool:
    result = await session.exec(
        select(TurmaAluno).where(
            TurmaAluno.aluno_id == aluno_id,
            TurmaAluno.turma_id == turma_id,
        )
    )
    return result.first() is not None


async def aluno_pode_ver_tarefa(session: AsyncSession, aluno: Usuario, tarefa: Tarefa) -> bool:
    if tarefa.turma_id is not None:
        if await aluno_matriculado(session, aluno.id, tarefa.turma_id):
            return True
    result = await session.exec(
        select(TarefaAluno).where(
            TarefaAluno.aluno_id == aluno.id,
            TarefaAluno.tarefa_id == tarefa.id,
        )
    )
    return result.first() is not None
