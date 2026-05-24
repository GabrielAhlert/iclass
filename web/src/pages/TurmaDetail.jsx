import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTurma, getAlunosTurma, adicionarAluno, removerAluno } from '../api/turmas'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import Input from '../components/Input'
import Modal from '../components/Modal'
import { ArrowLeft, UserPlus, UserMinus, Hash, Users } from 'lucide-react'

export default function TurmaDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const [turma, setTurma] = useState(null)
  const [alunos, setAlunos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [alunoId, setAlunoId] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canManage = user?.tipo === 'admin' || user?.tipo === 'professor'

  const loadAlunos = () => getAlunosTurma(id).then((r) => setAlunos(r.data)).catch(() => {})

  useEffect(() => {
    Promise.all([
      getTurma(id).then((r) => setTurma(r.data)),
      loadAlunos(),
    ]).finally(() => setLoading(false))
  }, [id])

  const handleAdd = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await adicionarAluno(id, alunoId)
      setModal(false)
      setAlunoId('')
      loadAlunos()
    } catch (err) {
      setError(err.response?.data?.detail || 'Erro ao adicionar aluno')
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async (alunoIdRemove) => {
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

      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Alunos ({alunos.length})</h2>
          </div>
          {canManage && (
            <Button onClick={() => setModal(true)} className="gap-1.5 text-xs px-3 py-1.5">
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
                  <p className="text-xs text-gray-400">Matriculado em {new Date(a.data_matricula).toLocaleDateString('pt-BR')}</p>
                </div>
                {canManage && (
                  <button
                    onClick={() => handleRemove(a.aluno_id)}
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

      <Modal open={modal} onClose={() => setModal(false)} title="Adicionar aluno">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="ID do aluno" type="number" value={alunoId} onChange={(e) => setAlunoId(e.target.value)} required placeholder="Ex: 42" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModal(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Adicionar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
