import client from './client'

const BASE = '/api/v1/avaliacoes'

export const getAvaliacoes = () => client.get(`${BASE}/`)
export const getAvaliacao = (id) => client.get(`${BASE}/${id}`)
export const criarAvaliacao = (data) => client.post(`${BASE}/`, data)
export const atualizarAvaliacao = (id, data) => client.patch(`${BASE}/${id}`, data)
