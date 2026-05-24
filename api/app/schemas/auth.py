from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class AlterarSenhaRequest(BaseModel):
    codigo: str
    nova_senha: str


class SolicitarRecuperacaoRequest(BaseModel):
    email: EmailStr
