import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  if (user.primeiro_acesso && location.pathname !== '/trocar-senha') {
    return <Navigate to="/trocar-senha" replace />
  }
  if (roles && !roles.includes(user.tipo)) return <Navigate to="/dashboard" replace />

  return children
}
