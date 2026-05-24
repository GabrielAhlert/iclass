from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from app.models import TipoArquivo


class ArquivoRead(BaseModel):
    id: int
    nome: str
    tipo: TipoArquivo
    tamanho_bytes: int
    url: str
    tarefa_id: Optional[int]
    resolucao_id: Optional[int]
    uploaded_at: datetime

    class Config:
        from_attributes = True
