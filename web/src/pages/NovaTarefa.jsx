import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getTurma } from '../api/turmas'
import { criarTarefa, uploadArquivoTarefa } from '../api/tarefas'
import { parseApiError } from '../api/errors'
import Button from '../components/Button'
import Input, { Select } from '../components/Input'
import RichTextEditor from '../components/RichTextEditor'
import { ArrowLeft, Hash, Upload } from 'lucide-react'

const FIBONACCI_OPTIONS = [
  { label: 'Peso 1',  value: 0 }, { label: 'Peso 1',  value: 1 },
  { label: 'Peso 2',  value: 2 }, { label: 'Peso 3',  value: 3 },
  { label: 'Peso 5',  value: 4 }, { label: 'Peso 8',  value: 5 },
  { label: 'Peso 13', value: 6 }, { label: 'Peso 21', value: 7 },
  { label: 'Peso 34', value: 8 }, { label: 'Peso 55', value: 9 },
]

export default function NovaTarefa() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [turma, setTurma] = useState(null)
  const [form, setForm] = useState({
    titulo: '', descricao: '', indice_fibonacci: 0, data_limite: '', prazo_fixo: false,
  })
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    getTurma(id).then((r) => setTurma(r.data)).catch(() => {})
  }, [id])

  const set = (f) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [f]: val }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await criarTarefa({
        titulo: form.titulo,
        descricao: form.descricao || null,
        indice_fibonacci: Number(form.indice_fibonacci),
        data_limite: form.data_limite || null,
        prazo_fixo: form.prazo_fixo,
        turma_id: Number(id),
      })
      if (file) await uploadArquivoTarefa(res.data.id, file)
      navigate(`/turmas/${id}`)
    } catch (err) {
      setError(parseApiError(err, 'Erro ao criar tarefa'))
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to={`/turmas/${id}`} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nova tarefa</h1>
          {turma && (
            <div className="flex items-center gap-1 mt-0.5">
              <Hash size={11} className="text-gray-400" />
              <p className="text-xs text-gray-500">{turma.nome}</p>
            </div>
          )}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-5">
        <Input
          label="Título"
          value={form.titulo}
          onChange={set('titulo')}
          required
          placeholder="Ex: Lista de exercícios 1"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descrição (opcional)</label>
          <RichTextEditor
            value={form.descricao}
            onChange={(html) => setForm((p) => ({ ...p, descricao: html }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select label="Peso (Fibonacci)" value={form.indice_fibonacci} onChange={set('indice_fibonacci')}>
            {FIBONACCI_OPTIONS.map((o, i) => (
              <option key={i} value={o.value}>{o.label}</option>
            ))}
          </Select>
          <Input
            label="Prazo (opcional)"
            type="datetime-local"
            value={form.data_limite}
            onChange={set('data_limite')}
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={form.prazo_fixo}
            onChange={set('prazo_fixo')}
            className="rounded"
          />
          Prazo fixo — entrega após o vencimento é marcada como atrasada
        </label>

        <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-400 transition-colors">
          <Upload size={15} className="text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-500 truncate">
            {file ? file.name : 'Anexar material (opcional · PDF ou imagem, máx 5 MB)'}
          </span>
          <input
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Link
            to={`/turmas/${id}`}
            className="flex-1 flex items-center justify-center rounded-xl border border-gray-300 text-sm font-medium text-gray-700 py-2.5 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
          <Button type="submit" loading={saving} className="flex-1">
            Criar tarefa
          </Button>
        </div>
      </form>
    </div>
  )
}
