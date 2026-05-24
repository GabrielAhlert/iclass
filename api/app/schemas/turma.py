from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class TurmaCreate(BaseModel):
    nome: str
    codigo_identificador: str
    professor_id: int


class TurmaRead(BaseModel):
    id: int
    nome: str
    codigo_identificador: str
    professor_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TurmaUpdate(BaseModel):
    nome: Optional[str] = None
    professor_id: Optional[int] = None


class TurmaAlunoRead(BaseModel):
    turma_id: int
    aluno_id: int
    data_matricula: datetime

    class Config:
        from_attributes = True
