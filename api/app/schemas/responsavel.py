from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LinkResponsavelCreate(BaseModel):
    aluno_id: int
    rotulo: Optional[str] = None


class LinkResponsavelRead(BaseModel):
    id: int
    token: str
    aluno_id: int
    aluno_nome: str
    rotulo: Optional[str]
    expira_em: datetime
    revogado: bool
    url: str

    class Config:
        from_attributes = True


class AlunoPublico(BaseModel):
    nome: str
    matricula: Optional[str] = None


class AvaliacaoPublica(BaseModel):
    tarefa_titulo: str
    peso: int
    nota: float
    participacao: float
    feedback: Optional[str] = None
    data_avaliacao: datetime


class TarefaPendentePublica(BaseModel):
    titulo: str
    data_limite: Optional[datetime] = None
    status: str


class PainelResponsavelRead(BaseModel):
    aluno: AlunoPublico
    media_geral: Optional[float] = None
    media_participacao: Optional[float] = None
    avaliacoes: list[AvaliacaoPublica]
    tarefas_pendentes: list[TarefaPendentePublica]
    expira_em: datetime
