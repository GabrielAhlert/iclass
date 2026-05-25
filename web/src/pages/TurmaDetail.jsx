import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTurma, getAlunosTurma, adicionarAluno, removerAluno } from '../api/turmas'
import { getTarefas } from '../api/tarefas'
import { getResolucoes } from '../api/resolucoes'
import { getUsuarios } from '../api/usuarios'
import { listarLinks, criarLink, revogarLink } from '../api/responsaveis'
import { parseApiError } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input, { Select } from '../components/Input'
import Modal from '../components/Modal'
import { FibBadge, StatusBadge } from '../components/Badge'
import {
  ArrowLeft, UserPlus, UserMinus, Hash, Users, BookOpen, Plus, Clock, ChevronRight,
  Share2, Copy, Trash2,
} from 'lucide-react'

export default function TurmaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAluno = user?.tipo === 'aluno'
  const canManage = user?.tipo === 'admin' || user?.tipo === 'professor'

  const [turma, setTurma] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [resolucoes, setResolucoes] = useState([])
  const [alunos, setAlunos] = useState([])
  const [todosAlunos, setTodosAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAluno, setModalAluno] = useState(false)
  const [alunoId, setAlunoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [linksAluno, setLinksAluno] = useState(null)
  const [linksLoading, setLinksLoading] = useState(false)
  const [novoRotulo, setNovoRotulo] = useState('')
  const [criandoLink, setCriandoLink] = useState(false)
  const [copiado, setCopiado] = useState(null)

  const loadAlunos = () => getAlunosTurma(id).then((r) => setAlunos(r.data)).catch(() => {})

  useEffect(() => {
    const calls = [
      getTurma(id).then((r) => setTurma(r.data)),
      getTarefas().then((r) => setTarefas(r.data.filter((t) => t.turma_id === Number(id)))).catch(() => {}),
    ]
    if (isAluno) {
      calls.push(getResolucoes().then((r) => setResolucoes(r.data)).catch(() => {}))
    } else {
      calls.push(loadAlunos())
      calls.push(getUsuarios().then((r) => setTodosAlunos(r.data.filter((u) => u.tipo === 'aluno'))).catch(() => {}))
    }
    Promise.all(calls).finally(() => setLoading(false))
  }, [id])

  const alunoMap = Object.fromEntries(todosAlunos.map((u) => [u.id, u.nome]))
  const matriculadosIds = new Set(alunos.map((a) => a.aluno_id))
  const alunosDisponiveis = todosAlunos.filter((u) => !matriculadosIds.has(u.id))
  const resolucaoMap = Object.fromEntries(resolucoes.map((r) => [r.tarefa_id, r]))

  const handleAddAluno = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adicionarAluno(id, alunoId)
      setModalAluno(false)
      setAlunoId('')
      loadAlunos()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao adicionar aluno'))
    } finally {
      setSaving(false)
    }
  }

  const abrirLinks = async (aluno) => {
    setLinksAluno({ ...aluno, lista: [] })
    setNovoRotulo('')
    setError('')
    setLinksLoading(true)
    try {
      const r = await listarLinks(aluno.aluno_id)
      const lista = r.data.map((l) => ({ ...l, url: `${window.location.origin}/responsavel/${l.token}` }))
      setLinksAluno({ ...aluno, lista })
    } catch (err) {
      setError(parseApiError(err, 'Erro ao carregar links'))
    } finally {
      setLinksLoading(false)
    }
  }

  const handleCriarLink = async (e) => {
    e.preventDefault()
    if (!linksAluno) return
    setCriandoLink(true)
    setError('')
    try {
      const r = await criarLink({ aluno_id: linksAluno.aluno_id, rotulo: novoRotulo || null })
      const novo = { ...r.data, url: `${window.location.origin}/responsavel/${r.data.token}` }
      setLinksAluno({ ...linksAluno, lista: [novo, ...linksAluno.lista] })
      setNovoRotulo('')
    } catch (err) {
      setError(parseApiError(err, 'Erro ao gerar link'))
    } finally {
      setCriandoLink(false)
    }
  }

  const handleRevogarLink = async (linkId) => {
    if (!confirm('Revogar este link? O responsável perderá o acesso.')) return
    try {
      await revogarLink(linkId)
      setLinksAluno({
        ...linksAluno,
        lista: linksAluno.lista.map((l) => l.id === linkId ? { ...l, revogado: true } : l),
      })
    } catch (err) {
      setError(parseApiError(err, 'Erro ao revogar'))
    }
  }

  const copiarUrl = async (url, id) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 1500)
    } catch {}
  }

  const handleRemoveAluno = async (alunoIdRemove) => {
    if (!confirm('Remover este aluno da turma?')) return
    await removerAluno(id, alunoIdRemove).catch(() => {})
    loadAlunos()
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/turmas" className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">{turma?.nome}</h1>
          <div className="flex items-center gap-1 mt-0.5">
            <Hash size={12} className="text-gray-400" />
            <p className="text-xs text-gray-500">{turma?.codigo_identificador}</p>
          </div>
        </div>
      </div>

      {/* Tarefas */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Tarefas ({tarefas.length})</h2>
          </div>
          {canManage && (
            <Link
              to={`/turmas/${id}/tarefas/nova`}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-xl transition-colors"
            >
              <Plus size={14} /> Nova tarefa
            </Link>
          )}
        </div>

        {tarefas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhuma tarefa nesta turma</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tarefas.map((t) => {
              const resolucao = resolucaoMap[t.id]
              return (
                <Link
                  key={t.id}
                  to={`/turmas/${id}/tarefas/${t.id}`}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl hover:shadow-sm transition-shadow bg-white"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">{t.titulo}</p>
                    {t.data_limite && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Clock size={11} className="text-gray-400" />
                        <p className="text-xs text-gray-400">
                          {new Date(t.data_limite).toLocaleDateString('pt-BR')}
                          {t.prazo_fixo && ' · fixo'}
                        </p>
                      </div>
                    )}
                  </div>
                  <FibBadge weight={t.peso_fibonacci} />
                  {isAluno && <StatusBadge status={resolucao?.status ?? 'pendente'} />}
                  <ChevronRight size={14} className="text-gray-400 flex-shrink-0" />
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Alunos — só para professor/admin */}
      {canManage && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-gray-500" />
              <h2 className="font-semibold text-gray-900">Alunos ({alunos.length})</h2>
            </div>
            <Button
              onClick={() => { setError(''); setAlunoId(''); setModalAluno(true) }}
              className="gap-1.5 text-xs px-3 py-1.5"
            >
              <UserPlus size={14} /> Adicionar
            </Button>
          </div>
          {alunos.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum aluno matriculado</p>
          ) : (
            <div className="flex flex-col gap-2">
              {alunos.map((a) => (
                <div key={a.aluno_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {alunoMap[a.aluno_id] ?? `Aluno #${a.aluno_id}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Matriculado em {new Date(a.data_matricula).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => abrirLinks(a)}
                      title="Gerar link para responsável"
                      className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                    >
                      <Share2 size={16} />
                    </button>
                    <button
                      onClick={() => handleRemoveAluno(a.aluno_id)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <UserMinus size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: links de responsável */}
      <Modal
        open={!!linksAluno}
        onClose={() => setLinksAluno(null)}
        title={`Acesso responsável · ${linksAluno ? (alunoMap[linksAluno.aluno_id] ?? `Aluno #${linksAluno.aluno_id}`) : ''}`}
      >
        <div className="flex flex-col gap-4">
          <form onSubmit={handleCriarLink} className="flex flex-col gap-2 p-3 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">Gerar novo link (válido por 7 dias)</p>
            <Input
              placeholder="Rótulo (opcional, ex.: 'Mãe')"
              value={novoRotulo}
              onChange={(e) => setNovoRotulo(e.target.value)}
              maxLength={128}
            />
            <Button type="submit" loading={criandoLink} className="self-start text-xs px-3 py-1.5">
              Gerar link
            </Button>
          </form>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex flex-col gap-2">
            <p className="text-xs font-medium text-gray-500">Links existentes</p>
            {linksLoading ? (
              <p className="text-sm text-gray-400 text-center py-2">Carregando…</p>
            ) : !linksAluno?.lista?.length ? (
              <p className="text-sm text-gray-400 text-center py-2">Nenhum link gerado</p>
            ) : linksAluno.lista.map((l) => {
              const expirado = new Date(l.expira_em) < new Date()
              const inativo = l.revogado || expirado
              return (
                <div key={l.id} className={`p-2 border rounded-xl ${inativo ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {l.rotulo || '(sem rótulo)'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {l.revogado ? 'Revogado' : expirado ? 'Expirado' : `Expira ${new Date(l.expira_em).toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                    {!inativo && (
                      <>
                        <button
                          onClick={() => copiarUrl(l.url, l.id)}
                          title="Copiar URL"
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600"
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleRevogarLink(l.id)}
                          title="Revogar"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                  {!inativo && (
                    <p className="text-[10px] text-gray-500 mt-1 break-all font-mono">
                      {copiado === l.id ? 'Copiado!' : l.url}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </Modal>

      {/* Modal: adicionar aluno */}
      <Modal open={modalAluno} onClose={() => setModalAluno(false)} title="Adicionar aluno">
        <form onSubmit={handleAddAluno} className="flex flex-col gap-4">
          {alunosDisponiveis.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">Todos os alunos já estão matriculados</p>
          ) : (
            <Select label="Aluno" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required>
              <option value="">Selecione um aluno</option>
              {alunosDisponiveis.map((a) => (
                <option key={a.id} value={a.id}>{a.nome}</option>
              ))}
            </Select>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalAluno(false)}>
              Cancelar
            </Button>
            {alunosDisponiveis.length > 0 && (
              <Button type="submit" loading={saving} className="flex-1">Adicionar</Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
