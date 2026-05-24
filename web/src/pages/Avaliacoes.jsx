import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getAvaliacoes, criarAvaliacao } from '../api/avaliacoes'
import { getResolucoes } from '../api/resolucoes'
import Button from '../components/Button'
import Input, { Textarea } from '../components/Input'
import Modal from '../components/Modal'
import { Star, Plus } from 'lucide-react'

function ScoreBar({ value, max = 10, color = 'bg-primary-500' }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-sm font-semibold text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

export default function Avaliacoes() {
  const { user } = useAuth()
  const [avaliacoes, setAvaliacoes] = useState([])
  const [resolucoes, setResolucoes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ resolucao_id: '', nota: '', participacao: '', feedback: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canEvaluate = user?.tipo === 'professor' || user?.tipo === 'admin'

  const load = () =>
    Promise.all([
      getAvaliacoes().then((r) => setAvaliacoes(r.data)),
      canEvaluate ? getResolucoes().then((r) => setResolucoes(r.data.filter((r) => r.status === 'entregue'))) : Promise.resolve(),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await criarAvaliacao({
        resolucao_id: Number(form.resolucao_id),
        nota: Number(form.nota),
        participacao: Number(form.participacao),
        feedback: form.feedback || null,
      })
      setModal(false)
      setForm({ resolucao_id: '', nota: '', participacao: '', feedback: '' })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao criar avaliação')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Avaliações</h1>
        {canEvaluate && (
          <Button onClick={() => setModal(true)} className="gap-1.5">
            <Plus size={16} /> Avaliar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : avaliacoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Star className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma avaliação ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {avaliacoes.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900">Resolução #{a.resolucao_id}</p>
                <p className="text-xs text-gray-400">{new Date(a.data_avaliacao).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="flex flex-col gap-2">
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium">Nota</p>
                  </div>
                  <ScoreBar value={a.nota} color="bg-primary-500" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <p className="text-xs text-gray-500 font-medium">Participação</p>
                  </div>
                  <ScoreBar value={a.participacao} color="bg-blue-500" />
                </div>
              </div>
              {a.feedback && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500 font-medium mb-0.5">Feedback</p>
                  <p className="text-sm text-gray-700">{a.feedback}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Avaliar resolução">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Resolução</label>
            <select
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:border-primary-500 outline-none bg-white"
              value={form.resolucao_id}
              onChange={set('resolucao_id')}
              required
            >
              <option value="">Selecione a resolução</option>
              {resolucoes.map((r) => (
                <option key={r.id} value={r.id}>Resolução #{r.id} — Aluno #{r.aluno_id}</option>
              ))}
            </select>
          </div>
          <Input label="Nota (0–10)" type="number" min="0" max="10" step="0.1" value={form.nota} onChange={set('nota')} required />
          <Input label="Participação (0–10)" type="number" min="0" max="10" step="0.1" value={form.participacao} onChange={set('participacao')} required />
          <Textarea label="Feedback (opcional)" value={form.feedback} onChange={set('feedback')} placeholder="Comentários sobre a resolução..." />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Avaliar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
