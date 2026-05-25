from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.db import get_session
from app.models import (
    LinkResponsavel, Usuario, TipoUsuario, Turma, TurmaAluno,
    Tarefa, TarefaAluno, Resolucao, StatusResolucao, Avaliacao,
    FIBONACCI,
)
from app.schemas.responsavel import (
    LinkResponsavelCreate, LinkResponsavelRead,
    PainelResponsavelRead, AlunoPublico,
    AvaliacaoPublica, TarefaPendentePublica,
)
from app.core.config import settings
from app.core.deps import get_current_user, require_role, is_admin, is_professor

router = APIRouter()

LINK_VALIDADE_DIAS = 7


def _montar_url(token: str) -> str:
    base = settings.public_web_url.rstrip("/")
    return f"{base}/responsavel/{token}"


async def _prof_pode_acessar_aluno(session: AsyncSession, professor_id: int, aluno_id: int) -> bool:
    result = await session.exec(
        select(TurmaAluno)
        .join(Turma, Turma.id == TurmaAluno.turma_id)
        .where(TurmaAluno.aluno_id == aluno_id, Turma.professor_id == professor_id)
    )
    return result.first() is not None


async def _serialize_link(session: AsyncSession, link: LinkResponsavel) -> LinkResponsavelRead:
    aluno = (await session.exec(select(Usuario).where(Usuario.id == link.aluno_id))).first()
    return LinkResponsavelRead(
        id=link.id,
        token=link.token,
        aluno_id=link.aluno_id,
        aluno_nome=aluno.nome if aluno else "",
        rotulo=link.rotulo,
        expira_em=link.expira_em,
        revogado=link.revogado,
        url=_montar_url(link.token),
    )


@router.post("/links", response_model=LinkResponsavelRead, status_code=status.HTTP_201_CREATED)
async def criar_link(
    data: LinkResponsavelCreate,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    aluno = (await session.exec(select(Usuario).where(Usuario.id == data.aluno_id))).first()
    if not aluno or aluno.tipo != TipoUsuario.aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    if is_professor(current_user):
        if not await _prof_pode_acessar_aluno(session, current_user.id, aluno.id):
            raise HTTPException(status_code=403, detail="Aluno não está em uma turma sua")

    link = LinkResponsavel(
        token=uuid4().hex,
        aluno_id=aluno.id,
        criado_por_id=current_user.id,
        rotulo=data.rotulo,
        expira_em=datetime.utcnow() + timedelta(days=LINK_VALIDADE_DIAS),
    )
    session.add(link)
    await session.commit()
    await session.refresh(link)
    return await _serialize_link(session, link)


@router.get("/links", response_model=list[LinkResponsavelRead])
async def listar_links(
    aluno_id: int | None = None,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    stmt = select(LinkResponsavel)
    if not is_admin(current_user):
        stmt = stmt.where(LinkResponsavel.criado_por_id == current_user.id)
    if aluno_id is not None:
        stmt = stmt.where(LinkResponsavel.aluno_id == aluno_id)
    stmt = stmt.order_by(LinkResponsavel.created_at.desc())
    links = (await session.exec(stmt)).all()
    return [await _serialize_link(session, l) for l in links]


@router.delete("/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revogar_link(
    link_id: int,
    session: AsyncSession = Depends(get_session),
    current_user: Usuario = Depends(require_role(TipoUsuario.professor, TipoUsuario.admin)),
):
    link = (await session.exec(select(LinkResponsavel).where(LinkResponsavel.id == link_id))).first()
    if not link:
        raise HTTPException(status_code=404, detail="Link não encontrado")
    if not is_admin(current_user) and link.criado_por_id != current_user.id:
        raise HTTPException(status_code=403, detail="Sem permissão")
    link.revogado = True
    session.add(link)
    await session.commit()


@router.get("/publico/{token}", response_model=PainelResponsavelRead)
async def painel_publico(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    link = (await session.exec(select(LinkResponsavel).where(LinkResponsavel.token == token))).first()
    if not link or link.revogado or link.expira_em < datetime.utcnow():
        raise HTTPException(status_code=404, detail="Link inválido ou expirado")

    aluno = (await session.exec(select(Usuario).where(Usuario.id == link.aluno_id))).first()
    if not aluno:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")

    resolucoes = (await session.exec(select(Resolucao).where(Resolucao.aluno_id == aluno.id))).all()
    res_por_id = {r.id: r for r in resolucoes}
    res_por_tarefa = {r.tarefa_id: r for r in resolucoes}

    tarefa_ids = {r.tarefa_id for r in resolucoes}
    tarefas: dict[int, Tarefa] = {}
    if tarefa_ids:
        ts = (await session.exec(select(Tarefa).where(Tarefa.id.in_(tarefa_ids)))).all()
        tarefas = {t.id: t for t in ts}

    avs = []
    if res_por_id:
        avs = (await session.exec(
            select(Avaliacao).where(Avaliacao.resolucao_id.in_(list(res_por_id.keys())))
        )).all()

    avaliacoes_pub: list[AvaliacaoPublica] = []
    soma_nota_pond = 0.0
    soma_part_pond = 0.0
    soma_pesos = 0
    for av in avs:
        res = res_por_id.get(av.resolucao_id)
        if not res:
            continue
        tarefa = tarefas.get(res.tarefa_id)
        if not tarefa:
            continue
        peso = FIBONACCI[tarefa.indice_fibonacci]
        avaliacoes_pub.append(AvaliacaoPublica(
            tarefa_titulo=tarefa.titulo,
            peso=peso,
            nota=av.nota,
            participacao=av.participacao,
            feedback=av.feedback,
            data_avaliacao=av.data_avaliacao,
        ))
        soma_nota_pond += av.nota * peso
        soma_part_pond += av.participacao * peso
        soma_pesos += peso

    avaliacoes_pub.sort(key=lambda a: a.data_avaliacao, reverse=True)
    media_geral = round(soma_nota_pond / soma_pesos, 2) if soma_pesos else None
    media_part = round(soma_part_pond / soma_pesos, 2) if soma_pesos else None

    # Tarefas pendentes: resolucao pendente/atrasada + tarefas atribuídas sem resolução
    pendentes_tarefa_ids: set[int] = set()
    for r in resolucoes:
        if r.status in (StatusResolucao.pendente, StatusResolucao.atrasada):
            pendentes_tarefa_ids.add(r.tarefa_id)

    turmas_aluno = (await session.exec(
        select(TurmaAluno.turma_id).where(TurmaAluno.aluno_id == aluno.id)
    )).all()
    turma_ids = [t for t in turmas_aluno]
    tarefas_individuais = (await session.exec(
        select(TarefaAluno.tarefa_id).where(TarefaAluno.aluno_id == aluno.id)
    )).all()

    candidatas: list[Tarefa] = []
    if turma_ids:
        candidatas += (await session.exec(
            select(Tarefa).where(Tarefa.turma_id.in_(turma_ids))
        )).all()
    if tarefas_individuais:
        candidatas += (await session.exec(
            select(Tarefa).where(Tarefa.id.in_(list(tarefas_individuais)))
        )).all()

    vistas = set()
    pendentes: list[TarefaPendentePublica] = []
    agora = datetime.utcnow()
    for t in candidatas:
        if t.id in vistas:
            continue
        vistas.add(t.id)
        res = res_por_tarefa.get(t.id)
        if res and res.status not in (StatusResolucao.pendente, StatusResolucao.atrasada):
            continue
        if res:
            status_str = res.status.value
        else:
            status_str = "atrasada" if (t.data_limite and t.data_limite < agora) else "pendente"
        pendentes.append(TarefaPendentePublica(
            titulo=t.titulo,
            data_limite=t.data_limite,
            status=status_str,
        ))

    pendentes.sort(key=lambda p: (p.data_limite or datetime.max))

    return PainelResponsavelRead(
        aluno=AlunoPublico(nome=aluno.nome, matricula=aluno.matricula),
        media_geral=media_geral,
        media_participacao=media_part,
        avaliacoes=avaliacoes_pub,
        tarefas_pendentes=pendentes,
        expira_em=link.expira_em,
    )
