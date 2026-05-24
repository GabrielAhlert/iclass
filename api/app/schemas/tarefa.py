from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional
from app.models import FIBONACCI


class TarefaCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    indice_fibonacci: int = 0
    data_limite: Optional[datetime] = None
    prazo_fixo: bool = False
    turma_id: Optional[int] = None

    @field_validator("indice_fibonacci")
    @classmethod
    def validar_indice(cls, v: int) -> int:
        if v < 0 or v > 9:
            raise ValueError("indice_fibonacci deve ser entre 0 e 9")
        return v


class TarefaRead(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str]
    indice_fibonacci: int
    peso_fibonacci: int
    data_limite: Optional[datetime]
    prazo_fixo: bool
    turma_id: Optional[int]
    professor_id: int
    created_at: datetime

    class Config:
        from_attributes = True

    @classmethod
    def from_tarefa(cls, t) -> "TarefaRead":
        return cls(
            id=t.id,
            titulo=t.titulo,
            descricao=t.descricao,
            indice_fibonacci=t.indice_fibonacci,
            peso_fibonacci=FIBONACCI[t.indice_fibonacci],
            data_limite=t.data_limite,
            prazo_fixo=t.prazo_fixo,
            turma_id=t.turma_id,
            professor_id=t.professor_id,
            created_at=t.created_at,
        )


class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    indice_fibonacci: Optional[int] = None
    data_limite: Optional[datetime] = None
    prazo_fixo: Optional[bool] = None
