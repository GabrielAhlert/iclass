import client from './client'

const BASE = '/api/v1/resolucoes'

export const getResolucoes = () => client.get(`${BASE}/`)
export const getResolucao = (id) => client.get(`${BASE}/${id}`)
export const entregarResolucao = (tarefa_id) =>
  client.post(`${BASE}/`, { tarefa_id })
export const getResolucoesTarefa = (tarefaId) =>
  client.get(`${BASE}/tarefa/${tarefaId}`)

export const uploadArquivoResolucao = (resolucaoId, file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/api/v1/arquivos/resolucao/${resolucaoId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
