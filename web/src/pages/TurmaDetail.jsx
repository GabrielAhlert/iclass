import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTurma, getAlunosTurma, adicionarAluno, removerAluno } from '../api/turmas'
import { getTarefas, uploadArquivoTarefa, getArquivosTarefa } from '../api/tarefas'
import { getResolucoes, getResolucoesTarefa, entregarResolucao, uploadArquivoResolucao } from '../api/resolucoes'
import { getUsuarios } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import { Select } from '../components/Input'
import Modal from '../components/Modal'
import RichTextEditor from '../components/RichTextEditor'
import { FibBadge, StatusBadge } from '../components/Badge'
import {
  ArrowLeft, UserPlus, UserMinus, Hash, Users, BookOpen, Plus,
  Clock, ChevronDown, ChevronUp, Paperclip, FileText, Image,
  Loader2, Upload, CheckCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ArquivoIcon({ tipo }) {
  return tipo === 'pdf'
    ? <FileText size={12} className="text-red-500" />
    : <Image size={12} className="text-blue-500" />
}

/* ─── Visão do PROFESSOR ─────────────────────────────────────── */

function TarefaRowProfessor({ tarefa, alunoMap }) {
  const [open, setOpen] = useState(false)
  const [resolucoes, setResolucoes] = useState([])
  const [arquivos, setArquivos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const fileRef = useRef(null)

  const loadData = async () => {
    const [res, arqs] = await Promise.all([
      getResolucoesTarefa(tarefa.id).catch(() => ({ data: [] })),
      getArquivosTarefa(tarefa.id).catch(() => ({ data: [] })),
    ])
    setResolucoes(res.data)
    setArquivos(arqs.data)
  }

  const toggle = async () => {
    if (!open) await loadData()
    setOpen((v) => !v)
  }

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      await uploadArquivoTarefa(tarefa.id, file)
      const r = await getArquivosTarefa(tarefa.id)
      setArquivos(r.data)
    } catch (err) {
      setUploadError(parseApiError(err, 'Erro ao enviar arquivo'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={toggle}
        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{tarefa.titulo}</p>
          {tarefa.data_limite && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-gray-400" />
              <p className="text-xs text-gray-400">
                {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                {tarefa.prazo_fixo && ' · fixo'}
              </p>
            </div>
          )}
        </div>
        <FibBadge weight={tarefa.peso_fibonacci} />
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-2 flex flex-col gap-3">
          {tarefa.descricao && (
            <div className="prose-content text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: tarefa.descricao }} />
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500">Materiais</p>
              <label className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
                {uploading ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                Anexar
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
            {uploadError && <p className="text-xs text-red-500 mb-1">{uploadError}</p>}
            {arquivos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum material anexado</p>
            ) : (
              <div className="flex flex-col gap-1">
                {arquivos.map((a) => (
                  <a key={a.id} href={`${API}${a.url}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-primary-600">
                    <ArquivoIcon tipo={a.tipo} />{a.nome}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Resoluções</p>
            {resolucoes.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma entrega ainda</p>
            ) : (
              <div className="flex flex-col gap-2">
                {resolucoes.map((r) => (
                  <div key={r.id} className="flex flex-col gap-1 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 font-medium">{alunoMap[r.aluno_id] ?? `Aluno #${r.aluno_id}`}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    {r.conteudo && (
                      <div className="prose-content text-xs text-gray-500 bg-white rounded-lg p-2 border border-gray-100" dangerouslySetInnerHTML={{ __html: r.conteudo }} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Visão do ALUNO ─────────────────────────────────────────── */

function TarefaCardAluno({ tarefa, resolucao, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [arquivos, setArquivos] = useState([])
  const [file, setFile] = useState(null)
  const [conteudo, setConteudo] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [arquivosLoaded, setArquivosLoaded] = useState(false)
  const fileRef = useRef(null)

  const status = resolucao?.status ?? 'pendente'
  const canSubmit = status === 'pendente' || status === 'atrasada'

  const handleExpand = async () => {
    if (!expanded && !arquivosLoaded) {
      const r = await getArquivosTarefa(tarefa.id).catch(() => ({ data: [] }))
      setArquivos(r.data)
      setArquivosLoaded(true)
    }
    setExpanded((v) => !v)
    setError('')
  }

  const handleEntregar = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await entregarResolucao(tarefa.id, conteudo)
      if (file) await uploadArquivoResolucao(res.data.id, file)
      setExpanded(false)
      setFile(null)
      onRefresh()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao entregar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={handleExpand}
        className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 text-sm">{tarefa.titulo}</p>
          {tarefa.data_limite && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock size={11} className="text-gray-400" />
              <p className="text-xs text-gray-400">
                {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                {tarefa.prazo_fixo && ' · fixo'}
              </p>
            </div>
          )}
        </div>
        <FibBadge weight={tarefa.peso_fibonacci} />
        <StatusBadge status={status} />
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 px-3 py-3 flex flex-col gap-3">
          {tarefa.descricao && (
            <div className="prose-content text-xs text-gray-600" dangerouslySetInnerHTML={{ __html: tarefa.descricao }} />
          )}

          {arquivos.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Materiais do professor</p>
              <div className="flex flex-col gap-1">
                {arquivos.map((a) => (
                  <a key={a.id} href={`${API}${a.url}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-primary-600">
                    <ArquivoIcon tipo={a.tipo} />{a.nome}
                  </a>
                ))}
              </div>
            </div>
          )}

          {resolucao?.data_entrega && (
            <p className="text-xs text-gray-500">
              Entregue em {new Date(resolucao.data_entrega).toLocaleString('pt-BR')}
            </p>
          )}

          {resolucao?.conteudo && !canSubmit && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Sua resposta</p>
              <div className="prose-content text-xs text-gray-700 bg-white rounded-lg p-2.5 border border-gray-200" dangerouslySetInnerHTML={{ __html: resolucao.conteudo }} />
            </div>
          )}

          {canSubmit && (
            <>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Resposta (opcional)</p>
                <RichTextEditor value={conteudo} onChange={setConteudo} />
              </div>
              <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-3 py-2.5 cursor-pointer hover:border-primary-400 transition-colors">
                <Upload size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 truncate">
                  {file ? file.name : 'Anexar arquivo (opcional · PDF ou imagem, máx 5 MB)'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {error && <p className="text-xs text-red-600">{error}</p>}
              <Button onClick={handleEntregar} loading={saving} className="w-full gap-2">
                <CheckCircle size={15} /> Confirmar entrega
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Página principal ───────────────────────────────────────── */

export default function TurmaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const isAluno = user?.tipo === 'aluno'
  const canManage = user?.tipo === 'admin' || user?.tipo === 'professor'

  const [turma, setTurma] = useState(null)
  const [tarefas, setTarefas] = useState([])
  const [resolucoes, setResolucoes] = useState([])   // só para aluno
  const [alunos, setAlunos] = useState([])
  const [todosAlunos, setTodosAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAluno, setModalAluno] = useState(false)
  const [alunoId, setAlunoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const loadTarefas = () =>
    getTarefas().then((r) => setTarefas(r.data.filter((t) => t.turma_id === Number(id)))).catch(() => {})

  const loadResolucoes = () =>
    getResolucoes().then((r) => setResolucoes(r.data)).catch(() => {})

  const loadAlunos = () => getAlunosTurma(id).then((r) => setAlunos(r.data)).catch(() => {})

  useEffect(() => {
    const calls = [
      getTurma(id).then((r) => setTurma(r.data)),
      loadTarefas(),
    ]
    if (isAluno) {
      calls.push(loadResolucoes())
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

  const handleRemoveAluno = async (alunoIdRemove) => {
    if (!confirm('Remover este aluno da turma?')) return
    await removerAluno(id, alunoIdRemove).catch(() => {})
    loadAlunos()
  }

  const refreshAluno = () => {
    loadTarefas()
    loadResolucoes()
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
            {isAluno
              ? tarefas.map((t) => (
                  <TarefaCardAluno
                    key={t.id}
                    tarefa={t}
                    resolucao={resolucaoMap[t.id]}
                    onRefresh={refreshAluno}
                  />
                ))
              : tarefas.map((t) => (
                  <TarefaRowProfessor key={t.id} tarefa={t} alunoMap={alunoMap} />
                ))
            }
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
            <Button onClick={() => { setError(''); setAlunoId(''); setModalAluno(true) }} className="gap-1.5 text-xs px-3 py-1.5">
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
                  <button
                    onClick={() => handleRemoveAluno(a.aluno_id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <UserMinus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalAluno(false)}>Cancelar</Button>
            {alunosDisponiveis.length > 0 && (
              <Button type="submit" loading={saving} className="flex-1">Adicionar</Button>
            )}
          </div>
        </form>
      </Modal>
    </div>
  )
}
