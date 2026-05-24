import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTarefa, getArquivosTarefa, uploadArquivoTarefa } from '../api/tarefas'
import { getResolucoes, getResolucoesTarefa, entregarResolucao, uploadArquivoResolucao } from '../api/resolucoes'
import { getAvaliacoes, criarAvaliacao } from '../api/avaliacoes'
import { getUsuarios } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import { abrirArquivoAutenticado } from '../api/client'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import RichTextEditor from '../components/RichTextEditor'
import { FibBadge, StatusBadge } from '../components/Badge'
import {
  ArrowLeft, Clock, Paperclip, FileText, Image, Loader2, Upload, CheckCircle, Star,
} from 'lucide-react'

function ArquivoIcon({ tipo }) {
  return tipo === 'pdf'
    ? <FileText size={13} className="text-red-500 flex-shrink-0" />
    : <Image size={13} className="text-blue-500 flex-shrink-0" />
}

function NotaDisplay({ label, valor }) {
  return (
    <div className="flex flex-col items-center bg-gray-50 rounded-xl px-4 py-2.5 border border-gray-200">
      <span className="text-xl font-bold text-gray-900">{Number(valor).toFixed(1)}</span>
      <span className="text-xs text-gray-500 mt-0.5">{label}</span>
    </div>
  )
}

/* ── Entrega do aluno ─────────────────────────────────────────── */

function SecaoEntrega({ resolucao, avaliacao, tarefaId, onRefresh }) {
  const [conteudo, setConteudo] = useState(resolucao?.conteudo || '')
  const [file, setFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const status = resolucao?.status ?? 'pendente'
  const canSubmit = status === 'pendente' || status === 'atrasada'

  const handleEntregar = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await entregarResolucao(tarefaId, conteudo)
      if (file) await uploadArquivoResolucao(res.data.id, file)
      setFile(null)
      onRefresh()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao entregar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Sua entrega</h2>
        <StatusBadge status={status} />
      </div>

      {resolucao?.data_entrega && (
        <p className="text-xs text-gray-500">
          Entregue em {new Date(resolucao.data_entrega).toLocaleString('pt-BR')}
        </p>
      )}

      {/* Avaliação recebida */}
      {avaliacao && (
        <div className="flex flex-col gap-3 p-4 bg-primary-50 rounded-xl border border-primary-100">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-primary-600" />
            <p className="text-sm font-semibold text-primary-800">Avaliação do professor</p>
          </div>
          <div className="flex gap-3">
            <NotaDisplay label="Nota" valor={avaliacao.nota} />
            <NotaDisplay label="Participação" valor={avaliacao.participacao} />
          </div>
          {avaliacao.feedback && (
            <p className="text-sm text-gray-700 leading-relaxed">{avaliacao.feedback}</p>
          )}
        </div>
      )}

      {/* Conteúdo entregue */}
      {resolucao?.conteudo && !canSubmit && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Sua resposta</p>
          <div
            className="prose-content text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100"
            dangerouslySetInnerHTML={{ __html: resolucao.conteudo }}
          />
        </div>
      )}

      {canSubmit && (
        <>
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Resposta (opcional)</p>
            <RichTextEditor value={conteudo} onChange={setConteudo} />
          </div>
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
            <CheckCircle size={16} /> Confirmar entrega
          </Button>
        </>
      )}
    </div>
  )
}

/* ── Card de resolução (professor) ────────────────────────────── */

function ResolucaoCard({ resolucao, nomeAluno, avaliacao, onAvaliado }) {
  const [formOpen, setFormOpen] = useState(false)
  const [nota, setNota] = useState('')
  const [participacao, setParticipacao] = useState('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleAvaliar = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      await criarAvaliacao({
        resolucao_id: resolucao.id,
        nota: Number(nota),
        participacao: Number(participacao),
        feedback: feedback || null,
      })
      setFormOpen(false)
      onAvaliado()
    } catch (err) {
      setError(parseApiError(err, 'Erro ao avaliar'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="py-4 first:pt-0 last:pb-0 flex flex-col gap-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{nomeAluno}</p>
        <StatusBadge status={resolucao.status} />
      </div>

      {resolucao.data_entrega && (
        <p className="text-xs text-gray-400">
          {new Date(resolucao.data_entrega).toLocaleString('pt-BR')}
        </p>
      )}

      {resolucao.conteudo && (
        <div
          className="prose-content text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100"
          dangerouslySetInnerHTML={{ __html: resolucao.conteudo }}
        />
      )}

      {/* Avaliação existente */}
      {avaliacao ? (
        <div className="flex flex-col gap-2 p-3 bg-primary-50 rounded-xl border border-primary-100">
          <div className="flex gap-3">
            <NotaDisplay label="Nota" valor={avaliacao.nota} />
            <NotaDisplay label="Participação" valor={avaliacao.participacao} />
          </div>
          {avaliacao.feedback && (
            <p className="text-sm text-gray-700">{avaliacao.feedback}</p>
          )}
        </div>
      ) : (resolucao.status === 'entregue' || resolucao.status === 'atrasada') && (
        <>
          {!formOpen ? (
            <button
              onClick={() => setFormOpen(true)}
              className="self-start flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 transition-colors"
            >
              <Star size={14} /> Avaliar
            </button>
          ) : (
            <form onSubmit={handleAvaliar} className="flex flex-col gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-sm font-semibold text-gray-800">Avaliação</p>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600">Nota (0–10)</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.0"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-gray-600">Participação (0–10)</span>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.5"
                    value={participacao}
                    onChange={(e) => setParticipacao(e.target.value)}
                    required
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.0"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-medium text-gray-600">Feedback (opcional)</span>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={3}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Comentários sobre a entrega..."
                />
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setError('') }}
                  className="flex-1 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <Button type="submit" loading={saving} className="flex-1">
                  Confirmar
                </Button>
              </div>
            </form>
          )}
        </>
      )}
    </div>
  )
}

/* ── Resoluções (professor/admin) ─────────────────────────────── */

function SecaoResolucoes({ tarefaId }) {
  const [resolucoes, setResolucoes] = useState([])
  const [avaliacaoMap, setAvaliacaoMap] = useState({})
  const [alunoMap, setAlunoMap] = useState({})
  const [loading, setLoading] = useState(true)

  const load = () =>
    Promise.all([
      getResolucoesTarefa(tarefaId),
      getAvaliacoes(),
      getUsuarios(),
    ]).then(([res, avals, users]) => {
      setResolucoes(res.data)
      setAvaliacaoMap(Object.fromEntries(avals.data.map((a) => [a.resolucao_id, a])))
      setAlunoMap(Object.fromEntries(users.data.filter((u) => u.tipo === 'aluno').map((u) => [u.id, u.nome])))
    }).catch(() => {}).finally(() => setLoading(false))

  useEffect(() => { load() }, [tarefaId])

  if (loading) return (
    <div className="flex justify-center py-6">
      <div className="animate-spin h-5 w-5 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-4">
        Resoluções ({resolucoes.length})
      </h2>
      {resolucoes.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Nenhuma entrega ainda</p>
      ) : (
        <div className="flex flex-col divide-y divide-gray-100">
          {resolucoes.map((r) => (
            <ResolucaoCard
              key={r.id}
              resolucao={r}
              nomeAluno={alunoMap[r.aluno_id] ?? `Aluno #${r.aluno_id}`}
              avaliacao={avaliacaoMap[r.id]}
              onAvaliado={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Página principal ─────────────────────────────────────────── */

export default function TarefaDetail() {
  const { id, tarefaId } = useParams()
  const { user } = useAuth()
  const isAluno = user?.tipo === 'aluno'

  const [tarefa, setTarefa] = useState(null)
  const [arquivos, setArquivos] = useState([])
  const [resolucao, setResolucao] = useState(null)
  const [avaliacao, setAvaliacao] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [loading, setLoading] = useState(true)
  const fileRef = useRef(null)

  const loadData = async () => {
    const [tarefaRes, arqRes] = await Promise.all([
      getTarefa(tarefaId),
      getArquivosTarefa(tarefaId).catch(() => ({ data: [] })),
    ])
    setTarefa(tarefaRes.data)
    setArquivos(arqRes.data)

    if (isAluno) {
      const [resolRes, avalRes] = await Promise.all([
        getResolucoes().catch(() => ({ data: [] })),
        getAvaliacoes().catch(() => ({ data: [] })),
      ])
      const minha = resolRes.data.find((r) => r.tarefa_id === Number(tarefaId))
      setResolucao(minha ?? null)
      if (minha) {
        setAvaliacao(avalRes.data.find((a) => a.resolucao_id === minha.id) ?? null)
      }
    }
  }

  useEffect(() => {
    loadData().catch(() => {}).finally(() => setLoading(false))
  }, [tarefaId])

  const handleUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    try {
      await uploadArquivoTarefa(tarefaId, file)
      const r = await getArquivosTarefa(tarefaId)
      setArquivos(r.data)
    } catch (err) {
      setUploadError(parseApiError(err, 'Erro ao enviar arquivo'))
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="animate-spin h-6 w-6 border-4 border-primary-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link to={`/turmas/${id}`} className="p-2 rounded-xl hover:bg-gray-100 text-gray-600 mt-0.5">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{tarefa?.titulo}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {tarefa?.data_limite && (
              <div className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                <p className="text-xs text-gray-500">
                  {new Date(tarefa.data_limite).toLocaleDateString('pt-BR')}
                  {tarefa.prazo_fixo && ' · prazo fixo'}
                </p>
              </div>
            )}
            {tarefa && <FibBadge weight={tarefa.peso_fibonacci} />}
          </div>
        </div>
      </div>

      {/* Descrição */}
      {tarefa?.descricao && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-900 mb-3">Descrição</h2>
          <div
            className="prose-content text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: tarefa.descricao }}
          />
        </div>
      )}

      {/* Materiais */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900">Materiais</h2>
          {!isAluno && (
            <label className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 cursor-pointer font-medium">
              {uploading
                ? <Loader2 size={14} className="animate-spin" />
                : <Paperclip size={14} />}
              Anexar
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          )}
        </div>
        {uploadError && <p className="text-sm text-red-500 mb-2">{uploadError}</p>}
        {arquivos.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum material anexado</p>
        ) : (
          <div className="flex flex-col gap-2">
            {arquivos.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => abrirArquivoAutenticado(a.url)}
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600 text-left"
              >
                <ArquivoIcon tipo={a.tipo} /> {a.nome}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Entrega / Resoluções */}
      {isAluno
        ? <SecaoEntrega
            resolucao={resolucao}
            avaliacao={avaliacao}
            tarefaId={Number(tarefaId)}
            onRefresh={loadData}
          />
        : <SecaoResolucoes tarefaId={tarefaId} />
      }
    </div>
  )
}
