import client from './client'

export const login = (email, senha) =>
  client.post('/api/v1/auth/login', { email, senha })

export const getMe = () =>
  client.get('/api/v1/usuarios/me')

export const getMeWithToken = (token) =>
  client.get('/api/v1/usuarios/me', {
    headers: { Authorization: `Bearer ${token}` },
  })

export const solicitarRecuperacao = (email) =>
  client.post('/api/v1/auth/solicitar-recuperacao', { email })

export const alterarSenha = (codigo, nova_senha) =>
  client.post('/api/v1/auth/alterar-senha', { codigo, nova_senha })
