import client from './client'
import axios from 'axios'

const BASE = '/api/v1/responsaveis'

export const listarLinks = (alunoId) =>
  client.get(`${BASE}/links`, { params: alunoId ? { aluno_id: alunoId } : {} })

export const criarLink = (data) => client.post(`${BASE}/links`, data)

export const revogarLink = (id) => client.delete(`${BASE}/links/${id}`)

export const buscarPainelPublico = (token) => {
  const baseURL = import.meta.env.VITE_API_URL || ''
  return axios.get(`${baseURL}${BASE}/publico/${token}`)
}
