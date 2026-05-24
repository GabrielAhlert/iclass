import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, BookOpen, ClipboardList,
  Star, LogOut, Menu, X, ShieldCheck
} from 'lucide-react'
import { useState } from 'react'
import { RoleBadge } from './Badge'

const BASE_NAV = [
  { to: '/dashboard',  label: 'Início',      icon: LayoutDashboard },
  { to: '/turmas',     label: 'Turmas',      icon: Users },
  { to: '/tarefas',    label: 'Tarefas',     icon: BookOpen },
  { to: '/resolucoes', label: 'Resoluções',  icon: ClipboardList },
  { to: '/avaliacoes', label: 'Avaliações',  icon: Star },
]

function NavItem({ to, label, icon: Icon, onClick }) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
        ${isActive ? 'bg-primary-100 text-primary-700' : 'text-gray-600 hover:bg-gray-100'}`
      }
    >
      <Icon size={18} />
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout({ children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const navItems = [
    ...BASE_NAV,
    ...(user?.tipo === 'admin' ? [{ to: '/usuarios', label: 'Usuários', icon: ShieldCheck }] : []),
  ]

  const handleLogout = () => { logout(); navigate('/login') }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-white border-r border-gray-200 fixed inset-y-0 left-0 z-30">
        <div className="flex items-center justify-center px-5 py-4 border-b">
          <img src="/logo.png" alt="iClass" className="h-14 w-auto object-contain" />
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {navItems.map((item) => <NavItem key={item.to} {...item} />)}
        </nav>
        <div className="p-3 border-t">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
              {user?.nome?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.nome}</p>
              <RoleBadge tipo={user?.tipo} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} /> Sair
          </button>
        </div>
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-white flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-5 border-b">
              <div className="flex items-center">
                <img src="/logo.png" alt="iClass" className="h-10 w-auto object-contain" />
              </div>
              <button onClick={() => setSidebarOpen(false)}><X size={20} /></button>
            </div>
            <nav className="flex-1 p-3 flex flex-col gap-1">
              {navItems.map((item) => (
                <NavItem key={item.to} {...item} onClick={() => setSidebarOpen(false)} />
              ))}
            </nav>
            <div className="p-3 border-t">
              <div className="flex items-center gap-3 px-3 py-2 mb-1">
                <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold text-sm">
                  {user?.nome?.[0]?.toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{user?.nome}</p>
                  <RoleBadge tipo={user?.tipo} />
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} /> Sair
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-1 rounded-lg hover:bg-gray-100">
            <Menu size={22} className="text-gray-700" />
          </button>
          <div className="flex items-center">
            <img src="/logo.png" alt="iClass" className="h-8 w-auto object-contain" />
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
