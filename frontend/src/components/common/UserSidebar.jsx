import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const Icon = ({ d, d2 }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none"
    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d={d}/>{d2 && <path d={d2}/>}
  </svg>
)

const NAV = [
  { label: 'Dashboard',     path: '/dashboard',            d: 'M1 1h6v6H1zM9 1h6v6H9zM1 9h6v6H1zM9 9h6v6H9z' },
  { label: 'Live charts',   path: '/dashboard/charts',     d: 'M2 12l3.5-4 2.5 2.5L11 6l3 4', d2: 'M1 1h14v14H1z' },
  { label: 'Place order',   path: '/dashboard/order',      d: 'M12 2H4a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2V4a2 2 0 00-2-2zM8 6v4M6 8h4' },
  { label: 'My strategies', path: '/dashboard/strategies', d: 'M8 2a5 5 0 015 5v3l1 2H2l1-2V7a5 5 0 015-5z' },
  { label: 'Trade history', path: '/dashboard/history',    d: 'M2 4h12M2 8h8M2 12h5' },
  { label: 'Brokers',       path: '/dashboard/brokers',    d: 'M6 2h4M8 2v3M3 7h10l-1 7H4L3 7z' },
]

export default function UserSidebar() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const planColor = {
    premium: '#EF9F27',
    standard: '#5DCAA5',
    basic: '#AFA9EC',
    custom: '#85B7EB',
  }[user?.plan] || '#AFA9EC'

  return (
    <aside style={{
      width: 'var(--sidebar-w)', flexShrink: 0,
      background: 'rgba(255,255,255,0.025)',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: '16px 10px',
    }}>
      {/* logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: '#fff', flexShrink: 0 }}>AT</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>AlgoTrade</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>TRADING PLATFORM</div>
        </div>
      </div>

      {/* nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(item => (
          <NavLink key={item.path} to={item.path} end={item.path === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '8px 10px', borderRadius: 8,
              fontSize: 13,
              color: isActive ? '#AFA9EC' : 'var(--text-muted)',
              background: isActive ? 'rgba(83,74,183,0.18)' : 'transparent',
              border: isActive ? '1px solid rgba(83,74,183,0.25)' : '1px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
            })}>
            <Icon d={item.d} d2={item.d2} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* trading mode indicator */}
      <div style={{ padding: '8px 10px', marginBottom: 8, borderRadius: 8, background: user?.tradingMode === 'live' ? 'rgba(29,158,117,0.1)' : 'rgba(239,159,39,0.1)', border: `1px solid ${user?.tradingMode === 'live' ? 'rgba(29,158,117,0.2)' : 'rgba(239,159,39,0.2)'}` }}>
        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Trading mode</div>
        <div style={{ fontSize: 12, fontWeight: 500, color: user?.tradingMode === 'live' ? 'var(--green)' : 'var(--amber)', textTransform: 'uppercase' }}>
          {user?.tradingMode || 'paper'}
        </div>
      </div>

      {/* bottom user */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', marginBottom: 6 }}>
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#fff', flexShrink: 0 }}>{initials}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: 10, color: planColor, textTransform: 'capitalize' }}>{user?.plan} plan</div>
          </div>
        </div>
        <button onClick={() => { signOut(); navigate('/login') }} className="btn btn-ghost w-full btn-sm">
          Sign out
        </button>
      </div>
    </aside>
  )
}
