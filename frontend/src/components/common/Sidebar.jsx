import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ d }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>
  </svg>
)

const NAV = [
  { label: 'Dashboard',        path: '/admin',             icon: 'M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z', perm: null },
  { label: 'Users',            path: '/admin/users',       icon: 'M8 8a3 3 0 100-6 3 3 0 000 6zM2 14c0-3 2.7-5 6-5s6 2 6 5', perm: 'manageUsers' },
  { label: 'Sub-admins',       path: '/admin/subadmins',   icon: 'M14 6H2M14 10H2', adminOnly: true },
  { label: 'Place trade',      path: '/admin/trade',       icon: 'M12 2H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM8 6v4M6 8h4', perm: 'placeTrades' },
  { label: 'Strategies',       path: '/admin/strategies',  icon: 'M2 10l3-6 3 4 2-3 3 5', perm: 'assignStrategies' },
  { label: 'Broker keys',      path: '/admin/brokers',     icon: 'M6 2h4M8 2v3M3 7h10l-1 7H4L3 7z', perm: 'manageBrokerKeys' },
  { label: 'P&L monitor',      path: '/admin/pnl',         icon: 'M2 12l3.5-4 2.5 2.5L11 6l3 4', perm: 'viewPnL' },
  { label: 'Audit log',        path: '/admin/audit',       icon: 'M2 4h12M2 8h8M2 12h5', perm: 'viewAuditLogs' },
  { label: 'Platform settings',path: '/admin/settings',    icon: 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 6v2l1.5 1.5', adminOnly: true },
]

export default function Sidebar() {
  const { user, signOut, can } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'AT'

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: 'rgba(255,255,255,0.025)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '16px 10px',
      overflowY: 'auto',
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>AT</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>AlgoTrade</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
            {user?.role === 'admin' ? 'ADMIN' : 'SUB-ADMIN'}
          </div>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => {
          if (item.adminOnly && user?.role !== 'admin') return null
          if (item.perm && !can(item.perm) && user?.role !== 'admin') return null
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/admin'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8,
                fontSize: 13,
                color: isActive ? '#AFA9EC' : 'var(--text-muted)',
                background: isActive ? 'rgba(83,74,183,0.18)' : 'transparent',
                border: isActive ? '1px solid rgba(83,74,183,0.25)' : '1px solid transparent',
                textDecoration: 'none', transition: 'all 0.15s',
              })}
            >
              <Icon d={item.icon} />
              {item.label}
            </NavLink>
          )
        })}
      </nav>

      {/* bottom user */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/login') }} className="btn btn-ghost w-full btn-sm">
          Sign out
        </button>
      </div>
    </aside>
  )
}