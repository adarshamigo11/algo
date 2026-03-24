import { useEffect, useState } from 'react'
import Topbar   from '../../components/common/Topbar'
import StatCard  from '../../components/common/StatCard'
import { getUsers, getAuditLogs, getStrategies } from '../../services/api'
import { useSocket } from '../../hooks/useSocket'

export default function AdminDashboard() {
  const [users,      setUsers]      = useState([])
  const [strategies, setStrategies] = useState([])
  const [logs,       setLogs]       = useState([])
  const [loading,    setLoading]    = useState(true)
  const { lastOrder } = useSocket()

  useEffect(() => {
    const load = async () => {
      try {
        const [u, s, l] = await Promise.all([
          getUsers(), getStrategies(), getAuditLogs({ limit: 8 }),
        ])
        setUsers(u.data)
        setStrategies(s.data)
        setLogs(l.data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const activeUsers = users.filter(u => u.isActive).length
  const autoEnabled = users.filter(u => u.automationEnabled).length

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <>
      <Topbar title="Dashboard" subtitle={today} />
      <div className="page-body">

        {/* stats row */}
        <div className="grid-4 mb-24">
          <StatCard label="Total users"      value={users.length}  sub={`${activeUsers} active`}  color="blue"   />
          <StatCard label="Automation on"    value={autoEnabled}   sub="users running algo"        color="green"  />
          <StatCard label="Strategies"       value={strategies.length} sub="in pool"               color="purple" />
          <StatCard label="Audit events"     value={logs.length}   sub="shown below"               color="amber"  />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16 }}>

          {/* recent audit log */}
          <div className="glass p-16">
            <div className="flex items-center justify-between mb-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Recent activity</div>
            </div>
            {loading ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map(log => (
                      <tr key={log._id}>
                        <td><span className="td-primary">{log.actorName || '—'}</span></td>
                        <td>
                          <span className={`badge ${
                            log.action.includes('order') ? 'badge-algo' :
                            log.action.includes('login') ? 'badge-green' :
                            'badge-gray'
                          }`}>{log.action.replace(/_/g, ' ')}</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {new Date(log.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* right column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* strategies */}
            <div className="glass p-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Strategy pool</div>
              {strategies.map((s, i) => (
                <div key={s._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: i < strategies.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-purple)', flexShrink: 0 }}/>
                  <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>{s.name}</div>
                  <span className={`badge ${s.isActive ? 'badge-green' : 'badge-gray'}`}>
                    {s.isActive ? 'active' : 'off'}
                  </span>
                </div>
              ))}
            </div>

            {/* last order */}
            {lastOrder && (
              <div className="glass p-16" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Last order update</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{lastOrder.symbol}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                  {lastOrder.action} · {lastOrder.status} · <span className={`badge badge-${lastOrder.userLabel}`}>{lastOrder.userLabel}</span>
                </div>
              </div>
            )}

            {/* system health */}
            <div className="glass p-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 10 }}>System</div>
              {[
                { label: 'API server',      ok: true  },
                { label: 'MongoDB',         ok: true  },
                { label: 'Angel One WS',    ok: true  },
                { label: 'Token refresh',   ok: true  },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ color: item.ok ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: item.ok ? 'var(--green)' : 'var(--red)' }}/>
                    {item.ok ? 'OK' : 'Error'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
