from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Usuario, TipoUsuario, Turma, TurmaAluno
from app.schemas.usuario import UsuarioCreate, UsuarioRead, UsuarioUpdate
from app.core.deps import get_current_user, require_role, is_admin, is_professor
from app.core.security import hash_password

router = APIRouter()


@router.get("/me", response_model=UsuarioRead)
async def get_me(current_user: Usuario = Depends(get_current_user)):
    return current_user


@router.get("/", response_model=list[UsuarioRead], dependencies=[Depends(require_role(TipoUsuario.admin))])
async def listar_usuarios(session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Usuario))
    return result.all()


@router.post("/", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED,
             dependencies=[Depends(require_role(TipoUsuario.admin))])
async def criar_usuario(data: UsuarioCreate, session: AsyncSession = Depends(get_session)):
    """RF 2.4 — Apenas admin cadastra novos usuários."""
    result = await session.exec(select(Usuario).where(Usuario.email == data.email))
    if result.first():
        raise HTTPException(status_code=409, detail="Email já cadastrado")

    usuario = Usuario(
        nome=data.nome,
        email=data.email,
        senha_hash=hash_password(data.senha),
        tipo=data.tipo,
        matricula=data.matricula,
    )
    session.add(usuario)
    await session.commit()
    await session.refresh(usuario)
    return usuario


@router.get("/{usuario_id}", response_model=UsuarioRead)
async def get_usuario(
    usuario_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.admin, TipoUsuario.professor)),
):
    result = await session.exec(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if is_professor(current_user) and usuario.id != current_user.id:
        if usuario.tipo != TipoUsuario.aluno:
            raise HTTPException(status_code=403, detail="Sem permissão")
        vinculo = await session.exec(
            select(TurmaAluno)
            .join(Turma, Turma.id == TurmaAluno.turma_id)
            .where(TurmaAluno.aluno_id == usuario.id, Turma.professor_id == current_user.id)
        )
        if not vinculo.first():
            raise HTTPException(status_code=403, detail="Sem permissão")
    return usuario


@router.patch("/{usuario_id}", response_model=UsuarioRead,
              dependencies=[Depends(require_role(TipoUsuario.admin))])
async def atualizar_usuario(
    usuario_id: int,
    data: UsuarioUpdate,
    session: AsyncSession = Depends(get_session),
):
    result = await session.exec(select(Usuario).where(Usuario.id == usuario_id))
    usuario = result.first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")

    for campo, valor in data.model_dump(exclude_none=True).items():
        setattr(usuario, campo, valor)

    session.add(usuario)
    await session.commit()
    await session.refresh(usuario)
    return usuario
