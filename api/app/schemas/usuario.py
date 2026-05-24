from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models import TipoUsuario


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    tipo: TipoUsuario = TipoUsuario.aluno
    matricula: Optional[str] = None


class UsuarioRead(BaseModel):
    id: int
    nome: str
    email: str
    tipo: TipoUsuario
    matricula: Optional[str]
    primeiro_acesso: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UsuarioUpdate(BaseModel):
    nome: Optional[str] = None
    matricula: Optional[str] = None
    is_active: Optional[bool] = None
