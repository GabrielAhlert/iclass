import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { getResolucoes, entregarResolucao } from '../api/resolucoes'
import { uploadArquivoResolucao } from '../api/resolucoes'
import { getTarefas } from '../api/tarefas'
import { getUsuarios } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import { StatusBadge, FibBadge } from '../components/Badge'
import Button from '../components/Button'
import { ClipboardList, Upload, CheckCircle } from 'lucide-react'

const STATUS_ORDER = { atrasada: 0, pendente: 1, entregue: 2, avaliada: 3 }

function ResolucaoCard({ resolucao, tarefaMap, alunoMap, isAluno, onRefresh }) {
  const [expanded, setExpanded] = useState(false)
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const tarefa = tarefaMap[resolucao.tarefa_id]
  const canSubmit = isAluno && (resolucao.status === 'pendente' || resolucao.status === 'atrasada')

  const handleEntregar = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await entregarResolucao(resolucao.tarefa_id)
      if (file) await uploadArquivoResolucao(res.data.id, file)
      setExpanded(false)
      setFile(null)
      onRefresh()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao entregar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="p-4 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate">
            {tarefa?.titulo ?? `Tarefa #${resolucao.tarefa_id}`}
          </p>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {tarefa && <FibBadge weight={tarefa.peso_fibonacci} />}
            <p className="text-xs text-gray-400">
              {resolucao.data_entrega
                ? `Entregue em ${new Date(resolucao.data_entrega).toLocaleString('pt-BR')}`
                : 'Não entregue'}
            </p>
          </div>
          {!isAluno && (
            <p className="text-xs text-gray-500 mt-0.5">
              {alunoMap[resolucao.aluno_id] ?? `Aluno #${resolucao.aluno_id}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={resolucao.status} />
          {canSubmit && (
            <button
              onClick={() => { setExpanded((v) => !v); setError('') }}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 px-2 py-1 rounded-lg hover:bg-primary-50 transition-colors"
            >
              {expanded ? 'Cancelar' : 'Entregar'}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
          <label className="flex items-center gap-2 border-2 border-dashed border-gray-300 rounded-xl px-4 py-3 cursor-pointer hover:border-primary-400 transition-colors">
            <Upload size={15} className="text-gray-400 flex-shrink-0" />
            <span className="text-sm text-gray-500 truncate">
              {file ? file.name : 'Anexar arquivo (opcional · PDF ou imagem, máx 5 MB)'}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </label>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button onClick={handleEntregar} loading={saving} className="w-full gap-2">
            <CheckCircle size={15} /> Confirmar entrega
          </Button>
        </div>
      )}
    </div>
  )
}

export default function Resolucoes() {
  const { user } = useAuth()
  const [resolucoes, setResolucoes] = useState([])
  const [tarefas, setTarefas] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)

  const isAluno = user?.tipo === 'aluno'

  const load = () => {
    setLoading(true)
    const calls = [
      getResolucoes().then((r) => setResolucoes(r.data)),
      getTarefas().then((r) => setTarefas(r.data)),
    ]
    if (!isAluno) calls.push(getUsuarios().then((r) => setUsuarios(r.data)).catch(() => {}))
    Promise.all(calls).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const tarefaMap = Object.fromEntries(tarefas.map((t) => [t.id, t]))
  const alunoMap = Object.fromEntries(usuarios.map((u) => [u.id, u.nome]))
  const sorted = [...resolucoes].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Resoluções</h1>

      {loading ? (
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <ClipboardList className="mx-auto text-gray-300 mb-2" size={36} />
          <p className="text-gray-500">Nenhuma resolução</p>
          {isAluno && (
            <p className="text-xs text-gray-400 mt-1">
              As tarefas das suas turmas aparecerão aqui quando forem criadas
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((r) => (
            <ResolucaoCard
              key={r.id}
              resolucao={r}
              tarefaMap={tarefaMap}
              alunoMap={alunoMap}
              isAluno={isAluno}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
