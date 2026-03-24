import { Outlet, Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import UserSidebar from '../../components/common/UserSidebar'
import Topbar     from '../../components/common/Topbar'
import { useSocket } from '../../hooks/useSocket'
import { useToast }  from '../../context/ToastContext'
import { useEffect }  from 'react'

export default function UserLayout() {
  const { user, ready } = useAuth()
  const { lastOrder, lastSignal } = useSocket()
  const toast = useToast()

  // show toast on every order update
  useEffect(() => {
    if (!lastOrder) return
    const label = lastOrder.status === 'executed' ? 'success' : 'error'
    toast[label](
      `${lastOrder.symbol} ${lastOrder.action} ${lastOrder.qty || ''} — ${lastOrder.status}`
    )
  }, [lastOrder])

  // show toast on strategy signal
  useEffect(() => {
    if (!lastSignal) return
    toast.info(`${lastSignal.strategyName}: ${lastSignal.action} ${lastSignal.symbol}`)
  }, [lastSignal])

  if (!ready) return null
  if (!user)  return <Navigate to="/login" replace />
  if (user.role !== 'user') return <Navigate to="/admin" replace />

  return (
    <div className="app-layout">
      <UserSidebar />
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  )
}
