import client from './client'

const BASE = '/api/v1/tarefas'

export const getTarefas = () => client.get(BASE)
export const getTarefa = (id) => client.get(`${BASE}/${id}`)
export const criarTarefa = (data) => client.post(BASE, data)
export const atualizarTarefa = (id, data) => client.patch(`${BASE}/${id}`, data)
export const removerTarefa = (id) => client.delete(`${BASE}/${id}`)
export const atribuirAluno = (tarefaId, alunoId) =>
  client.post(`${BASE}/${tarefaId}/alunos/${alunoId}`)

export const uploadArquivoTarefa = (tarefaId, file) => {
  const form = new FormData()
  form.append('file', file)
  return client.post(`/api/v1/arquivos/tarefa/${tarefaId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}

export const getArquivosTarefa = (tarefaId) =>
  client.get(`/api/v1/arquivos/tarefa/${tarefaId}`)
