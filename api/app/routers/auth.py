import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import Usuario, CodigoRecuperacao, TipoUsuario
from app.schemas.auth import Token, LoginRequest, AlterarSenhaRequest, SolicitarRecuperacaoRequest
from app.schemas.usuario import UsuarioCreate, UsuarioRead
from app.core.security import hash_password, verify_password, create_access_token
from app.core.deps import get_current_user

router = APIRouter()

# RF 4: expiração do código de recuperação em 15 minutos (RNF4)
EXPIRACAO_CODIGO_MINUTOS = 15


@router.post("/register", response_model=UsuarioRead, status_code=status.HTTP_201_CREATED)
async def registrar(data: UsuarioCreate, session: AsyncSession = Depends(get_session)):
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


@router.post("/login", response_model=Token)
async def login(data: LoginRequest, session: AsyncSession = Depends(get_session)):
    result = await session.exec(select(Usuario).where(Usuario.email == data.email))
    usuario = result.first()

    if not usuario or not verify_password(data.senha, usuario.senha_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciais inválidas")
    if not usuario.is_active:
        raise HTTPException(status_code=403, detail="Usuário inativo")

    token = create_access_token(subject=str(usuario.id), role=usuario.tipo)
    return Token(access_token=token)


@router.post("/solicitar-recuperacao", status_code=status.HTTP_202_ACCEPTED)
async def solicitar_recuperacao(
    data: SolicitarRecuperacaoRequest,
    session: AsyncSession = Depends(get_session),
):
    """RF 1.4 / RF 1.5 — Gera código de recuperação (simulado; em produção envia e-mail)."""
    result = await session.exec(select(Usuario).where(Usuario.email == data.email))
    usuario = result.first()

    # Retorna 202 mesmo se e-mail não existir (não revelar cadastro)
    if not usuario:
        return {"detail": "Se o e-mail existir, um código será enviado"}

    codigo = secrets.token_hex(6).upper()
    expira = datetime.now(timezone.utc) + timedelta(minutes=EXPIRACAO_CODIGO_MINUTOS)

    rec = CodigoRecuperacao(usuario_id=usuario.id, codigo=codigo, expira_em=expira)
    session.add(rec)
    await session.commit()

    # TODO: enviar por e-mail em produção
    return {"detail": "Código gerado", "codigo_debug": codigo}


@router.post("/alterar-senha", status_code=status.HTTP_200_OK)
async def alterar_senha(
    data: AlterarSenhaRequest,
    session: AsyncSession = Depends(get_session),
):
    """RF 1.5 — Valida código e altera senha."""
    result = await session.exec(
        select(CodigoRecuperacao).where(
            CodigoRecuperacao.codigo == data.codigo,
            CodigoRecuperacao.utilizado == False,
        )
    )
    rec = result.first()

    if not rec:
        raise HTTPException(status_code=400, detail="Código inválido ou já utilizado")

    if datetime.now(timezone.utc) > rec.expira_em.replace(tzinfo=timezone.utc):
        raise HTTPException(status_code=400, detail="Código expirado")

    user_result = await session.exec(select(Usuario).where(Usuario.id == rec.usuario_id))
    usuario = user_result.first()
    usuario.senha_hash = hash_password(data.nova_senha)
    usuario.primeiro_acesso = False

    rec.utilizado = True
    session.add(usuario)
    session.add(rec)
    await session.commit()
    return {"detail": "Senha alterada com sucesso"}


@router.post("/trocar-senha-primeiro-acesso", status_code=status.HTTP_200_OK)
async def trocar_senha_primeiro_acesso(
    nova_senha: str,
    current_user: Usuario = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """RF 1.3 — Troca de senha obrigatória no primeiro acesso."""
    result = await session.exec(select(Usuario).where(Usuario.id == current_user.id))
    usuario = result.first()
    usuario.senha_hash = hash_password(nova_senha)
    usuario.primeiro_acesso = False
    session.add(usuario)
    await session.commit()
    return {"detail": "Senha atualizada"}
