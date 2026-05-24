import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTarefas } from '../api/tarefas'
import { getResolucoes } from '../api/resolucoes'
import { getTurmas } from '../api/turmas'
import { getAvaliacoes } from '../api/avaliacoes'
import { FibBadge, StatusBadge } from '../components/Badge'
import { BookOpen, Users, ClipboardList, Star, ChevronRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, color, to }) {
  return (
    <Link to={to} className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="flex-1">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <ChevronRight size={16} className="text-gray-400" />
    </Link>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const [tarefas, setTarefas] = useState([])
  const [resolucoes, setResolucoes] = useState([])
  const [turmas, setTurmas] = useState([])
  const [avaliacoes, setAvaliacoes] = useState([])

  useEffect(() => {
    getTarefas().then((r) => setTarefas(r.data)).catch(() => {})
    getResolucoes().then((r) => setResolucoes(r.data)).catch(() => {})
    getTurmas().then((r) => setTurmas(r.data)).catch(() => {})
    getAvaliacoes().then((r) => setAvaliacoes(r.data)).catch(() => {})
  }, [])

  const pendentes = resolucoes.filter((r) => r.status === 'pendente').length
  const atrasadas = resolucoes.filter((r) => r.status === 'atrasada').length

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <p className="text-gray-500 text-sm">Bem-vindo de volta,</p>
        <h1 className="text-2xl font-bold text-gray-900">{user?.nome} 👋</h1>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users}         label="Turmas"     value={turmas.length}    color="bg-blue-500"    to="/turmas" />
        <StatCard icon={BookOpen}      label="Tarefas"    value={tarefas.length}   color="bg-primary-600" to="/tarefas" />
        <StatCard icon={ClipboardList} label="Resoluções" value={resolucoes.length} color="bg-orange-500" to="/resolucoes" />
        <StatCard icon={Star}          label="Avaliações" value={avaliacoes.length} color="bg-purple-500" to="/avaliacoes" />
      </div>

      {/* Alertas para aluno */}
      {user?.tipo === 'aluno' && (pendentes > 0 || atrasadas > 0) && (
        <div className="flex flex-col gap-2">
          {pendentes > 0 && (
            <Link to="/resolucoes" className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
              <span className="text-yellow-600 text-lg">⏳</span>
              <div>
                <p className="text-sm font-medium text-yellow-800">{pendentes} tarefa{pendentes > 1 ? 's' : ''} pendente{pendentes > 1 ? 's' : ''}</p>
                <p className="text-xs text-yellow-600">Clique para ver e entregar</p>
              </div>
            </Link>
          )}
          {atrasadas > 0 && (
            <Link to="/resolucoes" className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="text-red-600 text-lg">⚠️</span>
              <div>
                <p className="text-sm font-medium text-red-800">{atrasadas} tarefa{atrasadas > 1 ? 's' : ''} atrasada{atrasadas > 1 ? 's' : ''}</p>
                <p className="text-xs text-red-600">Prazo encerrado</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Últimas tarefas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Últimas tarefas</h2>
          <Link to="/tarefas" className="text-sm text-primary-600 hover:underline">Ver todas</Link>
        </div>
        {tarefas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <BookOpen className="mx-auto text-gray-300 mb-2" size={32} />
            <p className="text-gray-500 text-sm">Nenhuma tarefa ainda</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tarefas.slice(0, 5).map((tarefa) => (
              <Link
                key={tarefa.id}
                to={`/tarefas/${tarefa.id}`}
                className="bg-white rounded-2xl border border-gray-200 p-4 flex items-start gap-3 hover:shadow-sm transition-shadow"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{tarefa.titulo}</p>
                  {tarefa.data_limite && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prazo: {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <FibBadge weight={tarefa.peso_fibonacci} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
