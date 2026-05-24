from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models import StatusResolucao


class ResolucaoCreate(BaseModel):
    tarefa_id: int
    conteudo: Optional[str] = None


class ResolucaoRead(BaseModel):
    id: int
    tarefa_id: int
    aluno_id: int
    data_entrega: Optional[datetime]
    status: StatusResolucao
    conteudo: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ResolucaoUpdate(BaseModel):
    status: Optional[StatusResolucao] = None
