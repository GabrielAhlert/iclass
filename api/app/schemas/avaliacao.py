from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class AvaliacaoCreate(BaseModel):
    resolucao_id: int
    nota: float
    participacao: float
    feedback: Optional[str] = None

    @field_validator("nota", "participacao")
    @classmethod
    def validar_nota(cls, v: float) -> float:
        if v < 0 or v > 10:
            raise ValueError("Nota deve ser entre 0 e 10")
        return round(v, 2)


class AvaliacaoRead(BaseModel):
    id: int
    resolucao_id: int
    professor_id: int
    nota: float
    participacao: float
    feedback: Optional[str]
    data_avaliacao: datetime

    class Config:
        from_attributes = True


class AvaliacaoUpdate(BaseModel):
    nota: Optional[float] = None
    participacao: Optional[float] = None
    feedback: Optional[str] = None
