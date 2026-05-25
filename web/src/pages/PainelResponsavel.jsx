import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { buscarPainelPublico } from '../api/responsaveis'
import { GraduationCap, Award, Clock, AlertCircle } from 'lucide-react'

const fmt = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'
const fmtDT = (d) => d ? new Date(d).toLocaleString('pt-BR') : '—'

export default function PainelResponsavel() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    buscarPainelPublico(token)
      .then((r) => setData(r.data))
      .catch((e) => {
        setErro(e?.response?.status === 404 ? 'Link inválido ou expirado.' : 'Erro ao carregar painel.')
      })
      .finally(() => setLoading(false))
  }, [token])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (erro) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-1">Acesso indisponível</h1>
          <p className="text-sm text-gray-600">{erro}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4">
      <div className="max-w-3xl mx-auto flex flex-col gap-5">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 bg-primary-50 rounded-xl">
              <GraduationCap size={20} className="text-primary-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{data.aluno.nome}</h1>
              {data.aluno.matricula && (
                <p className="text-xs text-gray-500">Matrícula: {data.aluno.matricula}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Link válido até {fmtDT(data.expira_em)}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Award size={14} /> Média geral
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.media_geral != null ? data.media_geral.toFixed(2) : '—'}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Award size={14} /> Participação
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {data.media_participacao != null ? data.media_participacao.toFixed(2) : '—'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Avaliações ({data.avaliacoes.length})</h2>
          {data.avaliacoes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Nenhuma avaliação lançada</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.avaliacoes.map((a, i) => (
                <div key={i} className="p-3 border border-gray-200 rounded-xl">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.tarefa_titulo}</p>
                    <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
                      peso {a.peso}
                    </span>
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-gray-600">
                    <span>Nota: <b className="text-gray-900">{a.nota.toFixed(2)}</b></span>
                    <span>Participação: <b className="text-gray-900">{a.participacao.toFixed(2)}</b></span>
                    <span className="text-gray-400 ml-auto">{fmt(a.data_avaliacao)}</span>
                  </div>
                  {a.feedback && (
                    <p className="text-xs text-gray-600 mt-2 italic">"{a.feedback}"</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Tarefas pendentes ({data.tarefas_pendentes.length})</h2>
          {data.tarefas_pendentes.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Sem pendências</p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.tarefas_pendentes.map((t, i) => (
                <div key={i} className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.titulo}</p>
                    {t.data_limite && (
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-400">
                        <Clock size={11} /> {fmt(t.data_limite)}
                      </div>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    t.status === 'atrasada' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">iClass · Visão do responsável</p>
      </div>
    </div>
  )
}
