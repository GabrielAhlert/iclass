import client from './client'

const BASE = '/api/v1/usuarios'

export const getUsuarios = () => client.get(`${BASE}/`)
export const getUsuario = (id) => client.get(`${BASE}/${id}`)
export const criarUsuario = (data) => client.post(`${BASE}/`, data)
export const atualizarUsuario = (id, data) => client.patch(`${BASE}/${id}`, data)
