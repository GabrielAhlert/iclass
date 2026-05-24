import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getTarefas } from '../api/tarefas'
import { FibBadge } from '../components/Badge'
import { BookOpen, Clock, ChevronRight } from 'lucide-react'

export default function Tarefas() {
  const [tarefas, setTarefas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTarefas().then((r) => setTarefas(r.data)).finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Tarefas</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : tarefas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma tarefa ainda</p>
          <p className="text-xs text-gray-400 mt-1">As tarefas são criadas dentro de cada turma</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {tarefas.map((t) => (
            <Link
              key={t.id}
              to={t.turma_id ? `/turmas/${t.turma_id}` : '#'}
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
    </div>
  )
}
