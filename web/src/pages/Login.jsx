import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { GraduationCap } from 'lucide-react'
import { login as apiLogin } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import Button from '../components/Button'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export default function Login() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [form, setForm] = useState({ email: '', senha: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // 1. Obtém o token
      const { data } = await apiLogin(form.email, form.senha)
      const token = data.access_token

      // 2. Busca dados do usuário via fetch nativo (sem interceptor axios)
      const resp = await fetch(`${API}/api/v1/usuarios/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}))
        throw new Error(body.detail || 'Erro ao buscar usuário')
      }

      const userData = await resp.json()

      // 3. Salva no contexto e redireciona
      login(token, userData)
      navigate('/dashboard')
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Credenciais inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary-600 flex items-center justify-center mb-3 shadow-lg">
            <GraduationCap className="text-white" size={30} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">iClass</h1>
          <p className="text-gray-500 text-sm mt-1">Plataforma educacional</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-5">Entrar na conta</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={form.email}
              onChange={set('email')}
              required
            />
            <Input
              label="Senha"
              type="password"
              placeholder="••••••••"
              value={form.senha}
              onChange={set('senha')}
              required
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1 py-2.5">
              Entrar
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/recuperar-senha" className="text-sm text-primary-600 hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
