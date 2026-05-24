import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trocarSenhaPrimeiroAcesso } from '../api/auth'
import { parseApiError } from '../api/errors'
import { useAuth } from '../context/AuthContext'
import Input from '../components/Input'
import Button from '../components/Button'

export default function TrocarSenha() {
  const navigate = useNavigate()
  const { user, setUser, logout } = useAuth()
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (nova.length < 6) {
      setError('A senha deve ter ao menos 6 caracteres')
      return
    }
    if (nova !== confirma) {
      setError('As senhas não conferem')
      return
    }
    setLoading(true)
    try {
      await trocarSenhaPrimeiroAcesso(nova)
      setUser({ ...user, primeiro_acesso: false })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(parseApiError(err, 'Erro ao trocar senha'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="iClass" className="h-28 w-auto object-contain mb-2" />
          <p className="text-gray-500 text-sm">Defina sua nova senha</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Primeiro acesso</h2>
          <p className="text-sm text-gray-500 mb-5">
            Por segurança, defina uma nova senha antes de continuar.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nova senha"
              type="password"
              placeholder="••••••••"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              required
              minLength={6}
              autoFocus
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              placeholder="••••••••"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              required
              minLength={6}
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full mt-1 py-2.5">
              Salvar nova senha
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => { logout(); navigate('/login', { replace: true }) }}
              className="text-sm text-gray-500 hover:underline"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
