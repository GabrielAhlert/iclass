import client from './client'

const BASE = '/api/v1/turmas'

export const getTurmas = () => client.get(BASE)
export const getTurma = (id) => client.get(`${BASE}/${id}`)
export const criarTurma = (data) => client.post(BASE, data)
export const atualizarTurma = (id, data) => client.patch(`${BASE}/${id}`, data)
export const removerTurma = (id) => client.delete(`${BASE}/${id}`)

export const getAlunosTurma = (turmaId) => client.get(`${BASE}/${turmaId}/alunos`)
export const adicionarAluno = (turmaId, alunoId) =>
  client.post(`${BASE}/${turmaId}/alunos/${alunoId}`)
export const removerAluno = (turmaId, alunoId) =>
  client.delete(`${BASE}/${turmaId}/alunos/${alunoId}`)
