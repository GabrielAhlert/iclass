import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Turmas from './pages/Turmas'
import TurmaDetail from './pages/TurmaDetail'
import Tarefas from './pages/Tarefas'
import Resolucoes from './pages/Resolucoes'
import Avaliacoes from './pages/Avaliacoes'
import Perfil from './pages/Perfil'
import Usuarios from './pages/Usuarios'
import NovaTarefa from './pages/NovaTarefa'
import TarefaDetail from './pages/TarefaDetail'
import TrocarSenha from './pages/TrocarSenha'
import PainelResponsavel from './pages/PainelResponsavel'

function Private({ children }) {
  return (
    <ProtectedRoute>
      <Layout>{children}</Layout>
    </ProtectedRoute>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/responsavel/:token" element={<PainelResponsavel />} />
          <Route path="/trocar-senha" element={<ProtectedRoute><TrocarSenha /></ProtectedRoute>} />
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Private><Dashboard /></Private>} />
          <Route path="/turmas"     element={<Private><Turmas /></Private>} />
          <Route path="/turmas/:id" element={<Private><TurmaDetail /></Private>} />
          <Route path="/turmas/:id/tarefas/nova" element={<Private><NovaTarefa /></Private>} />
          <Route path="/turmas/:id/tarefas/:tarefaId" element={<Private><TarefaDetail /></Private>} />
          <Route path="/tarefas"    element={<Private><Tarefas /></Private>} />
          <Route path="/resolucoes" element={<Private><Resolucoes /></Private>} />
          <Route path="/avaliacoes" element={<Private><Avaliacoes /></Private>} />
          <Route path="/perfil"     element={<Private><Perfil /></Private>} />
          <Route path="/usuarios"   element={<Private><Usuarios /></Private>} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
