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
          <Route path="/"           element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard"  element={<Private><Dashboard /></Private>} />
          <Route path="/turmas"     element={<Private><Turmas /></Private>} />
          <Route path="/turmas/:id" element={<Private><TurmaDetail /></Private>} />
          <Route path="/tarefas"    element={<Private><Tarefas /></Private>} />
          <Route path="/resolucoes" element={<Private><Resolucoes /></Private>} />
          <Route path="/avaliacoes" element={<Private><Avaliacoes /></Private>} />
          <Route path="/perfil"     element={<Private><Perfil /></Private>} />
          <Route path="*"           element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
