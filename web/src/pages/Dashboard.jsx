import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTarefas } from '../api/tarefas'
import { getResolucoes } from '../api/resolucoes'
import { getTurmas } from '../api/turmas'
import { getAvaliacoes } from '../api/avaliacoes'
import { FibBadge, StatusBadge } from '../components/Badge'
import { Users, BookOpen, Star, ChevronRight, Hash, ClipboardCheck } from 'lucide-react'

/* ─── Aluno ───────────────────────────────────────────────────── */

function DashboardAluno({ user }) {
  const [turmas, setTurmas] = useState([])
  const [resolucoes, setResolucoes] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])

  useEffect(() => {
    getTurmas().then((r) => setTurmas(r.data)).catch(() => {})
    getResolucoes().then((r) => setResolucoes(r.data)).catch(() => {})
    getAvaliacoes().then((r) => setAvaliacoes(r.data)).catch(() => {})
  }, [])

  const pendentes = resolucoes.filter((r) => r.status === 'pendente').length
  const atrasadas = resolucoes.filter((r) => r.status === 'atrasada').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-gray-500 text-sm">Bem-vindo de volta,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.nome}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Link to="/turmas" className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:shadow-sm transition-shadow">
          <p className="text-2xl font-bold text-gray-900">{turmas.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">turmas</p>
        </Link>
        <Link to="/avaliacoes" className="bg-white rounded-2xl border border-gray-200 p-4 text-center hover:shadow-sm transition-shadow">
          <p className="text-2xl font-bold text-gray-900">{avaliacoes.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">avaliações</p>
        </Link>
        <div className={`rounded-2xl border p-4 text-center ${atrasadas > 0 ? 'bg-red-50 border-red-200' : pendentes > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold ${atrasadas > 0 ? 'text-red-600' : pendentes > 0 ? 'text-yellow-600' : 'text-gray-900'}`}>
            {pendentes + atrasadas}
          </p>
          <p className={`text-xs mt-0.5 ${atrasadas > 0 ? 'text-red-500' : pendentes > 0 ? 'text-yellow-600' : 'text-gray-500'}`}>
            pendentes
          </p>
        </div>
      </div>

      {(pendentes > 0 || atrasadas > 0) && (
        <div className="flex flex-col gap-2">
          {pendentes > 0 && (
            <Link to="/turmas" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span className="text-yellow-600 text-lg">⏳</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">{pendentes} tarefa{pendentes > 1 ? 's' : ''} pendente{pendentes > 1 ? 's' : ''}</p>
                <p className="text-xs text-yellow-600">Acesse suas turmas para entregar</p>
              </div>
            </Link>
          )}
          {atrasadas > 0 && (
            <Link to="/turmas" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-600 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">{atrasadas} tarefa{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600">Prazo encerrado</p>
              </div>
            </Link>
          )}
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Minhas turmas</h2>
          <Link to="/turmas" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
        </div>
        {turmas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Users className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma turma ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {turmas.map((t) => (
              <Link
                key={t.id}
                to={`/turmas/${t.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <Users size={16} className="text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{t.nome}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Hash size={10} className="text-gray-400" />
                    <p className="text-xs text-gray-500">{t.codigo_identificador}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Professor / Admin ───────────────────────────────────────── */

function TurmaSummaryCard({ turma, tarefas, resolucoes }) {
  const tarefasTurma = tarefas.filter((t) => t.turma_id === turma.id)
  const tarefaIds = new Set(tarefasTurma.map((t) => t.id))
  const resolucoesTodas = resolucoes.filter((r) => tarefaIds.has(r.tarefa_id))
  const paraAvaliar = resolucoesTodas.filter((r) => r.status === 'entregue' || r.status === 'atrasada').length
  const avaliadas = resolucoesTodas.filter((r) => r.status === 'avaliada').length

  return (
    <Link
      to={`/turmas/${turma.id}`}
      className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow"
    >
      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
        <Users size={18} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900">{turma.nome}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Hash size={10} className="text-gray-400" />
          <p className="text-xs text-gray-500">{turma.codigo_identificador}</p>
        </div>
        <div className="flex items-center gap-3 mt-1.5">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <BookOpen size={11} /> {tarefasTurma.length} tarefa{tarefasTurma.length !== 1 ? 's' : ''}
          </span>
          {paraAvaliar > 0 ? (
            <span className="flex items-center gap-1 text-xs font-medium text-orange-600 bg-orange-50 rounded-full px-2 py-0.5">
              <ClipboardCheck size={11} /> {paraAvaliar} para avaliar
            </span>
          ) : avaliadas > 0 ? (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <ClipboardCheck size={11} /> {avaliadas} avaliada{avaliadas !== 1 ? 's' : ''}
            </span>
          ) : null}
        </div>
      </div>
      <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
    </Link>
  )
}

function DashboardProfessor({ user }) {
  const [turmas, setTurmas] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [resolucoes, setResolucoes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getTurmas().then((r) => setTurmas(r.data)).catch(() => {}),
      getTarefas().then((r) => setTarefas(r.data)).catch(() => {}),
      getResolucoes().then((r) => setResolucoes(r.data)).catch(() => {}),
    ]).finally(() => setLoading(false))
  }, [])

  const totalParaAvaliar = resolucoes.filter((r) => r.status === 'entregue' || r.status === 'atrasada').length

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-gray-500 text-sm">Bem-vindo de volta,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.nome}</h1>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{turmas.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">turmas</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{tarefas.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">tarefas</p>
        </div>
        <div className={`rounded-2xl border p-4 text-center ${totalParaAvaliar > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-2xl font-bold ${totalParaAvaliar > 0 ? 'text-orange-600' : 'text-gray-900'}`}>
            {totalParaAvaliar}
          </p>
          <p className={`text-xs mt-0.5 ${totalParaAvaliar > 0 ? 'text-orange-500' : 'text-gray-500'}`}>
            para avaliar
          </p>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Turmas</h2>
          <Link to="/turmas" className="text-sm text-primary-600 hover:underline">Gerenciar</Link>
        </div>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin h-5 w-5 border-4 border-primary-600 border-t-transparent rounded-full" />
          </div>
        ) : turmas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Users className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma turma cadastrada</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {turmas.map((t) => (
              <TurmaSummaryCard
                key={t.id}
                turma={t}
                tarefas={tarefas}
                resolucoes={resolucoes}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Entry point ─────────────────────────────────────────────── */

export default function Dashboard() {
  const { user } = useAuth()

  if (user?.tipo === 'aluno') return <DashboardAluno user={user} />
  return <DashboardProfessor user={user} />
}
