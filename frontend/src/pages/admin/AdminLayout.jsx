import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Sidebar from '../../components/common/Sidebar'

export default function AdminLayout() {
  const { user, ready } = useAuth()

  if (!ready) return null
  if (!user)  return <Navigate to="/login" replace />
  if (user.role === 'user') return <Navigate to="/dashboard" replace />

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
