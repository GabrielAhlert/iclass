from sqlmodel import SQLModel, Field
from typing import Optional
from enum import Enum
from datetime import datetime

FIBONACCI = [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]


class TipoUsuario(str, Enum):
    aluno = "aluno"
    professor = "professor"
    admin = "admin"


class TipoArquivo(str, Enum):
    pdf = "pdf"
    imagem = "imagem"


class StatusResolucao(str, Enum):
    pendente = "pendente"
    entregue = "entregue"
    avaliada = "avaliada"
    atrasada = "atrasada"


class Usuario(SQLModel, table=True):
    __tablename__ = "usuarios"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(max_length=128)
    email: str = Field(unique=True, index=True, max_length=256)
    senha_hash: str
    tipo: TipoUsuario = Field(default=TipoUsuario.aluno)
    matricula: Optional[str] = Field(default=None, max_length=32)
    primeiro_acesso: bool = Field(default=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CodigoRecuperacao(SQLModel, table=True):
    __tablename__ = "codigos_recuperacao"

    id: Optional[int] = Field(default=None, primary_key=True)
    usuario_id: int = Field(foreign_key="usuarios.id")
    codigo: str = Field(max_length=64)
    expira_em: datetime
    utilizado: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Turma(SQLModel, table=True):
    __tablename__ = "turmas"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(max_length=128)
    codigo_identificador: str = Field(unique=True, index=True, max_length=32)
    professor_id: int = Field(foreign_key="usuarios.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TurmaAluno(SQLModel, table=True):
    __tablename__ = "turmas_alunos"

    turma_id: int = Field(foreign_key="turmas.id", primary_key=True)
    aluno_id: int = Field(foreign_key="usuarios.id", primary_key=True)
    data_matricula: datetime = Field(default_factory=datetime.utcnow)


class Tarefa(SQLModel, table=True):
    __tablename__ = "tarefas"

    id: Optional[int] = Field(default=None, primary_key=True)
    titulo: str = Field(max_length=256)
    descricao: Optional[str] = Field(default=None)
    # Índice 0-9 na sequência FIBONACCI → pesos 1, 1, 2, 3, 5, 8, 13, 21, 34, 55
    indice_fibonacci: int = Field(default=0, ge=0, le=9)
    data_limite: Optional[datetime] = Field(default=None)
    prazo_fixo: bool = Field(default=False)
    turma_id: Optional[int] = Field(default=None, foreign_key="turmas.id")
    professor_id: int = Field(foreign_key="usuarios.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @property
    def peso_fibonacci(self) -> int:
        return FIBONACCI[self.indice_fibonacci]


class TarefaAluno(SQLModel, table=True):
    """Atribuição individual de tarefa a aluno (quando turma_id é nulo)."""
    __tablename__ = "tarefas_alunos"

    tarefa_id: int = Field(foreign_key="tarefas.id", primary_key=True)
    aluno_id: int = Field(foreign_key="usuarios.id", primary_key=True)


class Resolucao(SQLModel, table=True):
    """Entrega de um aluno para uma tarefa."""
    __tablename__ = "resolucoes"

    id: Optional[int] = Field(default=None, primary_key=True)
    tarefa_id: int = Field(foreign_key="tarefas.id")
    aluno_id: int = Field(foreign_key="usuarios.id")
    data_entrega: Optional[datetime] = Field(default=None)
    status: StatusResolucao = Field(default=StatusResolucao.pendente)
    conteudo: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Arquivo(SQLModel, table=True):
    """Arquivo anexado a uma tarefa (professor) ou resolução (aluno)."""
    __tablename__ = "arquivos"

    id: Optional[int] = Field(default=None, primary_key=True)
    nome: str = Field(max_length=256)
    tipo: TipoArquivo
    tamanho_bytes: int
    url: str = Field(max_length=512)
    tarefa_id: Optional[int] = Field(default=None, foreign_key="tarefas.id")
    resolucao_id: Optional[int] = Field(default=None, foreign_key="resolucoes.id")
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)


class LinkResponsavel(SQLModel, table=True):
    """Token público para responsável visualizar avaliações do aluno."""
    __tablename__ = "links_responsavel"

    id: Optional[int] = Field(default=None, primary_key=True)
    token: str = Field(unique=True, index=True, max_length=64)
    aluno_id: int = Field(foreign_key="usuarios.id", index=True)
    criado_por_id: int = Field(foreign_key="usuarios.id")
    rotulo: Optional[str] = Field(default=None, max_length=128)
    expira_em: datetime
    revogado: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Avaliacao(SQLModel, table=True):
    """Avaliação do professor sobre a resolução de um aluno."""
    __tablename__ = "avaliacoes"

    id: Optional[int] = Field(default=None, primary_key=True)
    resolucao_id: int = Field(foreign_key="resolucoes.id", unique=True)
    professor_id: int = Field(foreign_key="usuarios.id")
    nota: float = Field(ge=0.0, le=10.0)
    participacao: float = Field(ge=0.0, le=10.0)
    feedback: Optional[str] = Field(default=None)
    data_avaliacao: datetime = Field(default_factory=datetime.utcnow)
