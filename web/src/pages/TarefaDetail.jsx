import { useEffect, useRef, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTarefa, getArquivosTarefa, uploadArquivoTarefa } from '../api/tarefas'
import { getResolucoes, getResolucoesTarefa, entregarResolucao, uploadArquivoResolucao } from '../api/resolucoes'
import { getUsuarios } from '../api/usuarios'
import { parseApiError } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'
import RichTextEditor from '../components/RichTextEditor'
import { FibBadge, StatusBadge } from '../components/Badge'
import {
  ArrowLeft, Clock, Paperclip, FileText, Image, Loader2, Upload, CheckCircle,
} from 'lucide-react'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ArquivoIcon({ tipo }) {
  return tipo === 'pdf'
    ? <FileText size={13} className="text-red-500 flex-shrink-0" />
    : <Image size={13} className="text-blue-500 flex-shrink-0" />
}

/* ── Entrega do aluno ─────────────────────────────────────────── */

function SecaoEntrega({ resolucao, tarefaId, onRefresh }) {
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

      {resolucao?.conteudo && !canSubmit && (
        <div
          className="prose-content text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100"
          dangerouslySetInnerHTML={{ __html: resolucao.conteudo }}
        />
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

/* ── Resoluções (professor/admin) ─────────────────────────────── */

function SecaoResolucoes({ tarefaId }) {
  const [resolucoes, setResolucoes] = useState([])
  const [alunoMap, setAlunoMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getResolucoesTarefa(tarefaId),
      getUsuarios(),
    ]).then(([res, users]) => {
      setResolucoes(res.data)
      setAlunoMap(
        Object.fromEntries(
          users.data.filter((u) => u.tipo === 'aluno').map((u) => [u.id, u.nome])
        )
      )
    }).catch(() => {}).finally(() => setLoading(false))
  }, [tarefaId])

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
            <div key={r.id} className="py-4 first:pt-0 last:pb-0 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">
                  {alunoMap[r.aluno_id] ?? `Aluno #${r.aluno_id}`}
                </p>
                <StatusBadge status={r.status} />
              </div>
              {r.data_entrega && (
                <p className="text-xs text-gray-400">
                  {new Date(r.data_entrega).toLocaleString('pt-BR')}
                </p>
              )}
              {r.conteudo && (
                <div
                  className="prose-content text-sm text-gray-700 bg-gray-50 rounded-xl p-4 border border-gray-100"
                  dangerouslySetInnerHTML={{ __html: r.conteudo }}
                />
              )}
            </div>
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
      const resolRes = await getResolucoes().catch(() => ({ data: [] }))
      const minha = resolRes.data.find((r) => r.tarefa_id === Number(tarefaId))
      setResolucao(minha ?? null)
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
              <a
                key={a.id}
                href={`${API}${a.url}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-primary-600"
              >
                <ArquivoIcon tipo={a.tipo} /> {a.nome}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Entrega / Resoluções */}
      {isAluno
        ? <SecaoEntrega resolucao={resolucao} tarefaId={Number(tarefaId)} onRefresh={loadData} />
        : <SecaoResolucoes tarefaId={tarefaId} />
      }
    </div>
  )
}
