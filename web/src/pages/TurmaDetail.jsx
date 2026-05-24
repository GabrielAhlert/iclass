import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTurma, getAlunosTurma, adicionarAluno, removerAluno } from '../api/turmas'
import { getTarefas, criarTarefa, uploadArquivoTarefa, getArquivosTarefa } from '../api/tarefas'
import { parseApiError } from '../api/errors'
import { getResolucoesTarefa } from '../api/resolucoes'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input, { Select, Textarea } from '../components/Input'
import Modal from '../components/Modal'
import { FibBadge, StatusBadge } from '../components/Badge'
import {
  ArrowLeft, UserPlus, UserMinus, Hash, Users,
  BookOpen, Plus, Clock, ChevronDown, ChevronUp,
  Paperclip, FileText, Image, Loader2
} from 'lucide-react'

const FIBONACCI_OPTIONS = [
  { label: 'Peso 1',  value: 0 }, { label: 'Peso 1',  value: 1 },
  { label: 'Peso 2',  value: 2 }, { label: 'Peso 3',  value: 3 },
  { label: 'Peso 5',  value: 4 }, { label: 'Peso 8',  value: 5 },
  { label: 'Peso 13', value: 6 }, { label: 'Peso 21', value: 7 },
  { label: 'Peso 34', value: 8 }, { label: 'Peso 55', value: 9 },
]

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ArquivoIcon({ tipo }) {
  return tipo === 'pdf'
    ? <FileText size={12} className="text-red-500" />
    : <Image size={12} className="text-blue-500" />
}

function TarefaRow({ tarefa, canManage }) {
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
          {tarefa.descricao && <p className="text-xs text-gray-600">{tarefa.descricao}</p>}

          {/* Arquivos */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-gray-500">Materiais</p>
              {canManage && (
                <label className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 cursor-pointer">
                  {uploading
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Paperclip size={12} />}
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
              )}
            </div>
            {uploadError && <p className="text-xs text-red-500 mb-1">{uploadError}</p>}
            {arquivos.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum material anexado</p>
            ) : (
              <div className="flex flex-col gap-1">
                {arquivos.map((a) => (
                  <a
                    key={a.id}
                    href={`${API}${a.url}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-primary-600"
                  >
                    <ArquivoIcon tipo={a.tipo} />
                    {a.nome}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Resoluções */}
          <div>
            <p className="text-xs font-medium text-gray-500 mb-1">Resoluções</p>
            {resolucoes.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhuma entrega ainda</p>
            ) : (
              <div className="flex flex-col gap-1">
                {resolucoes.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Aluno #{r.aluno_id}</span>
                    <StatusBadge status={r.status} />
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

export default function TurmaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [turma, setTurma] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalAluno, setModalAluno] = useState(false)
  const [modalTarefa, setModalTarefa] = useState(false)
  const [alunoId, setAlunoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [formTarefa, setFormTarefa] = useState({
    titulo: '', descricao: '', indice_fibonacci: 0, data_limite: '', prazo_fixo: false,
  })

  const canManage = user?.tipo === 'admin' || user?.tipo === 'professor'

  const loadAlunos = () => getAlunosTurma(id).then((r) => setAlunos(r.data)).catch(() => {})
  const loadTarefas = () =>
    getTarefas().then((r) => setTarefas(r.data.filter((t) => t.turma_id === Number(id)))).catch(() => {})

  useEffect(() => {
    Promise.all([
      getTurma(id).then((r) => setTurma(r.data)),
      loadAlunos(),
      loadTarefas(),
    ]).finally(() => setLoading(false))
  }, [id])

  const setT = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setFormTarefa((prev) => ({ ...prev, [f]: val }))
  }

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

  const handleCriarTarefa = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await criarTarefa({
        titulo: formTarefa.titulo,
        descricao: formTarefa.descricao || null,
        indice_fibonacci: Number(formTarefa.indice_fibonacci),
        data_limite: formTarefa.data_limite || null,
        prazo_fixo: formTarefa.prazo_fixo,
        turma_id: Number(id),
      })
      setModalTarefa(false)
      setFormTarefa({ titulo: '', descricao: '', indice_fibonacci: 0, data_limite: '', prazo_fixo: false })
      loadTarefas()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao criar tarefa'))
    } finally {
      setSaving(false)
    }
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
            <Button onClick={() => { setError(''); setModalTarefa(true) }} className="gap-1.5 text-xs px-3 py-1.5">
              <Plus size={14} /> Nova tarefa
            </Button>
          )}
        </div>
        {tarefas.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhuma tarefa nesta turma</p>
        ) : (
          <div className="flex flex-col gap-2">
            {tarefas.map((t) => <TarefaRow key={t.id} tarefa={t} canManage={canManage} />)}
          </div>
        )}
      </div>

      {/* Alunos */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Alunos ({alunos.length})</h2>
          </div>
          {canManage && (
            <Button onClick={() => { setError(''); setModalAluno(true) }} className="gap-1.5 text-xs px-3 py-1.5">
              <UserPlus size={14} /> Adicionar
            </Button>
          )}
        </div>
        {alunos.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">Nenhum aluno matriculado</p>
        ) : (
          <div className="flex flex-col gap-2">
            {alunos.map((a) => (
              <div key={a.aluno_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">Aluno #{a.aluno_id}</p>
                  <p className="text-xs text-gray-400">
                    Matriculado em {new Date(a.data_matricula).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemoveAluno(a.aluno_id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: nova tarefa */}
      <Modal open={modalTarefa} onClose={() => setModalTarefa(false)} title="Nova Tarefa">
        <form onSubmit={handleCriarTarefa} className="flex flex-col gap-4">
          <Input label="Título" value={formTarefa.titulo} onChange={setT('titulo')} required placeholder="Ex: Lista de exercícios 1" />
          <Textarea label="Descrição (opcional)" value={formTarefa.descricao} onChange={setT('descricao')} placeholder="Descreva a atividade..." />
          <Select label="Peso (Fibonacci)" value={formTarefa.indice_fibonacci} onChange={setT('indice_fibonacci')}>
            {FIBONACCI_OPTIONS.map((o, i) => (
              <option key={i} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input label="Prazo (opcional)" type="datetime-local" value={formTarefa.data_limite} onChange={setT('data_limite')} />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={formTarefa.prazo_fixo} onChange={setT('prazo_fixo')} className="rounded" />
            Prazo fixo (após vencimento = atrasada)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalTarefa(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Criar</Button>
          </div>
        </form>
      </Modal>

      {/* Modal: adicionar aluno */}
      <Modal open={modalAluno} onClose={() => setModalAluno(false)} title="Adicionar aluno">
        <form onSubmit={handleAddAluno} className="flex flex-col gap-4">
          <Input label="ID do aluno" type="number" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required placeholder="Ex: 42" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalAluno(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
