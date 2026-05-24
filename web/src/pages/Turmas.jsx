import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTurmas, criarTurma } from '../api/turmas'
import { getUsuarios } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input, { Select } from '../components/Input'
import { Users, Plus, ChevronRight, Hash } from 'lucide-react'

function TurmaCard({ turma }) {
  return (
    <Link
      to={`/turmas/${turma.id}`}
      className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
        <Users size={18} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{turma.nome}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Hash size={11} className="text-gray-400" />
          <p className="text-xs text-gray-500">{turma.codigo_identificador}</p>
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </Link>
  )
}

export default function Turmas() {
  const { user } = useAuth()
  const [turmas, setTurmas] = useState([])
  const [professores, setProfessores] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ nome: '', codigo_identificador: '', professor_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canCreate = user?.tipo === 'admin' || user?.tipo === 'professor'

  const load = () => getTurmas().then((r) => setTurmas(r.data)).finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  const openModal = async () => {
    setError('')
    setForm({ nome: '', codigo_identificador: '', professor_id: '' })
    if (user?.tipo === 'admin' && professores.length === 0) {
      try {
        const r = await getUsuarios()
        setProfessores(r.data.filter((u) => u.tipo === 'professor'))
      } catch {}
    }
    setModal(true)
  }

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await criarTurma({
        nome: form.nome,
        codigo_identificador: form.codigo_identificador,
        professor_id: user.tipo === 'professor' ? user.id : Number(form.professor_id),
      })
      setModal(false)
      load()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao criar turma'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Turmas</h1>
        {canCreate && (
          <Button onClick={openModal} className="gap-1.5">
            <Plus size={16} /> Nova
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : turmas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <Users className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma turma cadastrada</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {turmas.map((t) => <TurmaCard key={t.id} turma={t} />)}
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Nova Turma">
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <Input label="Nome da turma" value={form.nome} onChange={set('nome')} required placeholder="Ex: 3º Ano A" />
          <Input label="Código identificador" value={form.codigo_identificador} onChange={set('codigo_identificador')} required placeholder="Ex: 3ANO-A-2024" />
          {user?.tipo === 'admin' && (
            <Select label="Professor responsável" value={form.professor_id} onChange={set('professor_id')} required>
              <option value="">Selecione um professor</option>
              {professores.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </Select>
          )}
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
