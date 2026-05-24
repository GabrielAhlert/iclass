import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getUsuarios, criarUsuario, atualizarUsuario } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import { RoleBadge } from '../components/Badge'
import Button from '../components/Button'
import Input, { Select } from '../components/Input'
import Modal from '../components/Modal'
import { Users, Plus, UserCheck, UserX, Pencil } from 'lucide-react'

export default function Usuarios() {
  const { user } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalCriar, setModalCriar] = useState(false)
  const [modalEditar, setModalEditar] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ nome: '', email: '', senha: '', tipo: 'aluno', matricula: '' })

  if (user?.tipo !== 'admin') return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <Users className="text-gray-300 mb-3" size={48} />
      <p className="text-gray-500 font-medium">Acesso restrito a administradores</p>
    </div>
  )

  const load = () => getUsuarios().then((r) => setUsuarios(r.data)).finally(() => setLoading(false))
  useEffect(() => { load() }, [])

  const set = (f) => (e) => setForm((prev) => ({ ...prev, [f]: e.target.value }))

  const handleCriar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await criarUsuario({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        tipo: form.tipo,
        matricula: form.matricula || null,
      })
      setModalCriar(false)
      setForm({ nome: '', email: '', senha: '', tipo: 'aluno', matricula: '' })
      load()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao criar usuário'))
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (u) => {
    await atualizarUsuario(u.id, { is_active: !u.is_active }).catch(() => {})
    load()
  }

  const tipoLabel = { aluno: 'Alunos', professor: 'Professores', admin: 'Administradores' }
  const grouped = ['admin', 'professor', 'aluno'].reduce((acc, tipo) => {
    const lista = usuarios.filter((u) => u.tipo === tipo)
    if (lista.length) acc[tipo] = lista
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Usuários</h1>
        <Button onClick={() => setModalCriar(true)} className="gap-1.5">
          <Plus size={16} /> Novo
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : (
        Object.entries(grouped).map(([tipo, lista]) => (
          <div key={tipo}>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              {tipoLabel[tipo]} ({lista.length})
            </h2>
            <div className="flex flex-col gap-2">
              {lista.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm flex-shrink-0">
                    {u.nome[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{u.nome}</p>
                      {!u.is_active && <span className="text-xs text-red-500">(inativo)</span>}
                    </div>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    {u.matricula && <p className="text-xs text-gray-400">Mat: {u.matricula}</p>}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RoleBadge tipo={u.tipo} />
                    <button
                      onClick={() => handleToggleAtivo(u)}
                      title={u.is_active ? 'Desativar' : 'Ativar'}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      {u.is_active ? <UserCheck size={16} /> : <UserX size={16} />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      <Modal open={modalCriar} onClose={() => setModalCriar(false)} title="Novo Usuário">
        <form onSubmit={handleCriar} className="flex flex-col gap-4">
          <Input label="Nome" value={form.nome} onChange={set('nome')} required />
          <Input label="E-mail" type="email" value={form.email} onChange={set('email')} required />
          <Input label="Senha" type="password" value={form.senha} onChange={set('senha')} required placeholder="Mínimo 6 caracteres" />
          <Select label="Tipo" value={form.tipo} onChange={set('tipo')}>
            <option value="aluno">Aluno</option>
            <option value="professor">Professor</option>
            <option value="admin">Administrador</option>
          </Select>
          <Input label="Matrícula (opcional)" value={form.matricula} onChange={set('matricula')} placeholder="Ex: 2024001" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setModalCriar(false)}>Cancelar</Button>
            <Button type="submit" loading={saving} className="flex-1">Criar</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
