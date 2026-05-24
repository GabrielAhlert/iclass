from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select
from jose import JWTError

from app.db import get_session
from app.models import Usuario, TipoUsuario
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
