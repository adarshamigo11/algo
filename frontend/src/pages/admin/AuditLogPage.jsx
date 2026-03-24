import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { getAuditLogs } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const ACTION_COLORS = {
  login:             'badge-green',
  user_created:      'badge-algo',
  user_updated:      'badge-algo',
  user_deleted:      'badge-red',
  order_placed:      'badge-green',
  order_rejected:    'badge-red',
  risk_block:        'badge-red',
  webhook_received:  'badge-amber',
  strategy_assigned: 'badge-algo',
  token_refreshed:   'badge-gray',
  broker_keys_saved: 'badge-gray',
  subadmin_created:  'badge-algo',
  auto_square_off:   'badge-amber',
}

export default function AuditLogPage() {
  const [logs,    setLogs]    = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ action: '', role: '', limit: 50 })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getAuditLogs({
        action: filters.action || undefined,
        role:   filters.role   || undefined,
        limit:  filters.limit,
      })
      setLogs(data)
    } catch { toast.error('Failed to load audit logs') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const f = (k, v) => setFilters(prev => ({ ...prev, [k]: v }))

  return (
    <>
      <Topbar title="Audit log" subtitle="Every action on the platform" />
      <div className="page-body">

        {/* filters */}
        <div className="flex gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 180 }} value={filters.action} onChange={e => f('action', e.target.value)}>
            <option value="">All actions</option>
            {Object.keys(ACTION_COLORS).map(a => (
              <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <select className="input" style={{ width: 140 }} value={filters.role} onChange={e => f('role', e.target.value)}>
            <option value="">All roles</option>
            <option value="admin">Admin</option>
            <option value="subadmin">Sub-admin</option>
            <option value="user">User</option>
            <option value="system">System</option>
          </select>
          <select className="input" style={{ width: 120 }} value={filters.limit} onChange={e => f('limit', e.target.value)}>
            <option value={50}>Last 50</option>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>
            {logs.length} events
          </div>
        </div>

        {/* table */}
        <div className="glass">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Actor</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target user</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No events found</td></tr>
                ) : logs.map(log => (
                  <tr key={log._id}>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(log.createdAt).toLocaleString('en-IN', {
                        day: '2-digit', month: 'short',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="td-primary">{log.actorName || '—'}</td>
                    <td>
                      <span className={`badge ${
                        log.actorRole === 'admin'    ? 'badge-algo'  :
                        log.actorRole === 'subadmin' ? 'badge-amber' :
                        log.actorRole === 'system'   ? 'badge-gray'  : 'badge-manual'
                      }`}>{log.actorRole}</span>
                    </td>
                    <td>
                      <span className={`badge ${ACTION_COLORS[log.action] || 'badge-gray'}`}>
                        {log.action.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                      {log.targetUserId ? String(log.targetUserId).slice(-6) : '—'}
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {log.meta ? JSON.stringify(log.meta).slice(0, 80) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  )
}
