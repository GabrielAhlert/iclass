import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getResolucoes, entregarResolucao, uploadArquivoResolucao } from '../api/resolucoes'
import { getTarefas } from '../api/tarefas'
import { StatusBadge, FibBadge } from '../components/Badge'
import Button from '../components/Button'
import Modal from '../components/Modal'
import { Select } from '../components/Input'
import { ClipboardList, Upload, Send } from 'lucide-react'

export default function Resolucoes() {
  const { user } = useAuth()
  const [resolucoes, setResolucoes] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ tarefa_id: '', file: null })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isAluno = user?.tipo === 'aluno'

  const load = () =>
    Promise.all([
      getResolucoes().then((r) => setResolucoes(r.data)),
      isAluno ? getTarefas().then((r) => setTarefas(r.data)) : Promise.resolve(),
    ]).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const handleEntregar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await entregarResolucao(Number(form.tarefa_id))
      if (form.file) {
        await uploadArquivoResolucao(res.data.id, form.file)
      }
      setModal(false)
      setForm({ tarefa_id: '', file: null })
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao entregar resolução')
    } finally {
      setSaving(false)
    }
  }

  const statusOrder = { atrasada: 0, pendente: 1, entregue: 2, avaliada: 3 }
  const sorted = [...resolucoes].sort((a, b) => statusOrder[a.status] - statusOrder[b.status])

  const getTarefaNome = (tarefaId) => tarefas.find((t) => t.id === tarefaId)?.titulo || `Tarefa #${tarefaId}`

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Resoluções</h1>
        {isAluno && (
          <Button onClick={() => setModal(true)} className="gap-1.5">
            <Send size={16} /> Entregar
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <ClipboardList className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma resolução ainda</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{getTarefaNome(r.tarefa_id)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.data_entrega
                      ? `Entregue em ${new Date(r.data_entrega).toLocaleString('pt-BR')}`
                      : 'Ainda não entregue'}
                  </p>
                  {!isAluno && <p className="text-xs text-gray-400">Aluno #{r.aluno_id}</p>}
                </div>
                <StatusBadge status={r.status} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Entregar tarefa">
        <form onSubmit={handleEntregar} className="flex flex-col gap-4">
          <Select
            label="Tarefa"
            value={form.tarefa_id}
            onChange={(e) => setForm((f) => ({ ...f, tarefa_id: e.target.value }))}
            required
          >
            <option value="">Selecione a tarefa</option>
            {tarefas.map((t) => (
              <option key={t.id} value={t.id}>{t.titulo}</option>
            ))}
          </Select>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Arquivo (PDF ou imagem, máx 5 MB)</label>
            <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-400 transition-colors">
              <Upload size={16} className="text-gray-400" />
              <span className="text-sm text-gray-500">
                {form.file ? form.file.name : 'Clique para selecionar arquivo'}
              </span>
              <input
                type="file"
                accept=".pdf,image/*"
                className="hidden"
                onChange={(e) => setForm((f) => ({ ...f, file: e.target.files[0] || null }))}
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Entregar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
