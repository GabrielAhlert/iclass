import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import { RoleBadge } from '../components/Badge'
import Button from '../components/Button'
import { LogOut, User, Mail, Hash } from 'lucide-react'

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-gray-500" />
      </div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value || '—'}</p>
      </div>
    </div>
  )
}

export default function Perfil() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-xl font-bold text-gray-900">Perfil</h1>

      {/* Avatar + nome */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-2xl">
          {user?.nome?.[0]?.toUpperCase()}
        </div>
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900">{user?.nome}</h2>
          <RoleBadge tipo={user?.tipo} />
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <InfoRow icon={User}  label="Nome"       value={user?.nome} />
        <InfoRow icon={Mail}  label="E-mail"     value={user?.email} />
        <InfoRow icon={Hash}  label="Matrícula"  value={user?.matricula} />
      </div>

      {/* Logout */}
      <Button variant="danger" onClick={handleLogout} className="w-full py-3 gap-2">
        <LogOut size={16} /> Sair da conta
      </Button>
    </div>
  )
}
