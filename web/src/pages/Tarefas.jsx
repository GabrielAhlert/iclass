import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTarefas, criarTarefa } from '../api/tarefas'
import { getTurmas } from '../api/turmas'
import { FibBadge } from '../components/Badge'
import Button from '../components/Button'
import Input, { Select, Textarea } from '../components/Input'
import Modal from '../components/Modal'
import { BookOpen, Plus, ChevronRight, Clock } from 'lucide-react'

const FIBONACCI_OPTIONS = [
  { label: 'Peso 1 (Muito fácil)',  value: 0 },
  { label: 'Peso 1',               value: 1 },
  { label: 'Peso 2 (Fácil)',       value: 2 },
  { label: 'Peso 3',               value: 3 },
  { label: 'Peso 5 (Médio)',       value: 4 },
  { label: 'Peso 8',               value: 5 },
  { label: 'Peso 13 (Difícil)',    value: 6 },
  { label: 'Peso 21',             value: 7 },
  { label: 'Peso 34 (Muito difícil)', value: 8 },
  { label: 'Peso 55',             value: 9 },
]

export default function Tarefas() {
  const { user } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [turmas, setTurmas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    titulo: '', descricao: '', indice_fibonacci: 0,
    data_limite: '', prazo_fixo: false, turma_id: '',
  })

  const canCreate = user?.tipo === 'professor' || user?.tipo === 'admin'

  const load = () =>
    Promise.all([
      getTarefas().then((r) => setTarefas(r.data)),
      canCreate ? getTurmas().then((r) => setTurmas(r.data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const set = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((prev) => ({ ...prev, [f]: val }))
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = {
        titulo: form.titulo,
        descricao: form.descricao || null,
        indice_fibonacci: Number(form.indice_fibonacci),
        data_limite: form.data_limite || null,
        prazo_fixo: form.prazo_fixo,
        turma_id: form.turma_id ? Number(form.turma_id) : null,
      }
      await criarTarefa(payload)
      setModal(false)
      setForm({ titulo: '', descricao: '', indice_fibonacci: 0, data_limite: '', prazo_fixo: false, turma_id: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar tarefa')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Tarefas</h1>
        {canCreate && (
          <Button onClick={() => setModal(true)} className="gap-1.5">
            <Plus size={16} /> Nova
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma tarefa ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tarefas.map((t) => (
            <Link
              key={t.id}
              to={`/tarefas/${t.id}`}
              className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{t.titulo}</p>
                {t.descricao && <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{t.descricao}</p>}
                {t.data_limite && (
                  <div className="flex items-center gap-1 mt-1.5">
                    <Clock size={11} className="text-gray-400" />
                    <p className="text-xs text-gray-400">
                      {new Date(t.data_limite).toLocaleDateString('pt-BR')}
                      {t.prazo_fixo && ' · prazo fixo'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <FibBadge weight={t.peso_fibonacci} />
                <ChevronRight size={14} className="text-gray-300" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Tarefa">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Título" value={form.titulo} onChange={set('titulo')} required placeholder="Ex: Lista de exercícios 1" />
          <Textarea label="Descrição (opcional)" value={form.descricao} onChange={set('descricao')} placeholder="Descreva a atividade..." />
          <Select label="Peso (Fibonacci)" value={form.indice_fibonacci} onChange={set('indice_fibonacci')}>
            {FIBONACCI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {turmas.length > 0 && (
            <Select label="Turma (opcional)" value={form.turma_id} onChange={set('turma_id')}>
              <option value="">Sem turma (individual)</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
          )}
          <Input label="Prazo (opcional)" type="datetime-local" value={form.data_limite} onChange={set('data_limite')} />
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.prazo_fixo} onChange={set('prazo_fixo')} className="rounded" />
            Prazo fixo (entrega após o prazo = atrasada)
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
