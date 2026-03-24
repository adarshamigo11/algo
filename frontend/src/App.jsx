import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

import LoginPage        from './pages/auth/LoginPage'
import AdminLayout      from './pages/admin/AdminLayout'
import AdminDashboard   from './pages/admin/AdminDashboard'
import UsersPage        from './pages/admin/UsersPage'
import SubAdminsPage    from './pages/admin/SubAdminsPage'
import StrategiesPage   from './pages/admin/StrategiesPage'
import PlaceTradePage   from './pages/admin/PlaceTradePage'
import BrokersPage      from './pages/admin/BrokersPage'
import PnLPage          from './pages/admin/PnLPage'
import AuditLogPage     from './pages/admin/AuditLogPage'
import SettingsPage     from './pages/admin/SettingsPage'

import UserLayout         from './pages/user/UserLayout'
import UserDashboard      from './pages/user/UserDashboard'
import ChartsPage         from './pages/user/ChartsPage'
import OrderPage          from './pages/user/OrderPage'
import UserStrategiesPage from './pages/user/StrategiesPage'
import TradeHistoryPage   from './pages/user/TradeHistoryPage'
import UserBrokersPage    from './pages/user/UserBrokersPage'

export default function App() {
  const { user, ready } = useAuth()

  if (!ready) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      Loading…
    </div>
  )

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin + SubAdmin portal */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index             element={<AdminDashboard />} />
        <Route path="users"      element={<UsersPage />} />
        <Route path="subadmins"  element={<SubAdminsPage />} />
        <Route path="strategies" element={<StrategiesPage />} />
        <Route path="trade"      element={<PlaceTradePage />} />
        <Route path="brokers"    element={<BrokersPage />} />
        <Route path="pnl"        element={<PnLPage />} />
        <Route path="audit"      element={<AuditLogPage />} />
        <Route path="settings"   element={<SettingsPage />} />
      </Route>

      {/* User portal */}
      <Route path="/dashboard" element={<UserLayout />}>
        <Route index             element={<UserDashboard />} />
        <Route path="charts"     element={<ChartsPage />} />
        <Route path="order"      element={<OrderPage />} />
        <Route path="strategies" element={<UserStrategiesPage />} />
        <Route path="history"    element={<TradeHistoryPage />} />
        <Route path="brokers"    element={<UserBrokersPage />} />
      </Route>

      <Route path="/" element={
        !user                ? <Navigate to="/login"     replace /> :
        user.role === 'user' ? <Navigate to="/dashboard" replace /> :
                               <Navigate to="/admin"     replace />
      }/>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}