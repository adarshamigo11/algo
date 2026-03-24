import { useEffect, useState } from 'react'
import Topbar    from '../../components/common/Topbar'
import StatCard  from '../../components/common/StatCard'
import { getUsers } from '../../services/api'
import api from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function PnLPage() {
  const [orders,  setOrders]  = useState([])
  const [users,   setUsers]   = useState([])
  const [filter,  setFilter]  = useState({ userId: '', label: '', limit: 100 })
  const [loading, setLoading] = useState(true)
  const toast = useToast()

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(() => {})
  }, [])

  const load = async () => {
    setLoading(true)
    try {
      const params = {
        limit:   filter.limit,
        userId:  filter.userId  || undefined,
        label:   filter.label   || undefined,
      }
      const { data } = await api.get('/admin/orders', { params })
      setOrders(data)
    } catch { toast.error('Failed to load orders') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filter])

  const f = (k, v) => setFilter(p => ({ ...p, [k]: v }))

  // summary stats
  const totalPnL  = orders.reduce((s, o) => s + (o.pnl || 0), 0)
  const executed  = orders.filter(o => o.status === 'executed').length
  const algoCount = orders.filter(o => o.userLabel === 'algo').length

  const fmt = (n) => n >= 0
    ? `+₹${Math.abs(n).toLocaleString('en-IN')}`
    : `-₹${Math.abs(n).toLocaleString('en-IN')}`

  return (
    <>
      <Topbar title="P&L monitor" subtitle="All users · all trades" />
      <div className="page-body">

        <div className="grid-4 mb-24">
          <StatCard label="Total orders"   value={orders.length} sub={`${executed} executed`}    color="blue"   />
          <StatCard label="Algo orders"    value={algoCount}     sub={`${orders.length - algoCount} manual`} color="purple" />
          <StatCard label="Combined P&L"   value={fmt(totalPnL)} sub="all users today"            color={totalPnL >= 0 ? 'green' : 'red'} subType={totalPnL >= 0 ? 'pos' : 'neg'} />
          <StatCard label="Users trading"  value={new Set(orders.map(o => String(o.userId))).size} sub="today"  color="amber"  />
        </div>

        {/* filters */}
        <div className="flex gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 200 }} value={filter.userId} onChange={e => f('userId', e.target.value)}>
            <option value="">All users</option>
            {users.map(u => <option key={u._id} value={u._id}>{u.name}</option>)}
          </select>
          <select className="input" style={{ width: 140 }} value={filter.label} onChange={e => f('label', e.target.value)}>
            <option value="">All labels</option>
            <option value="algo">Algo</option>
            <option value="manual">Manual</option>
          </select>
          <select className="input" style={{ width: 120 }} value={filter.limit} onChange={e => f('limit', e.target.value)}>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>

        {/* orders table */}
        <div className="glass">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Symbol</th>
                  <th>Action</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Label</th>
                  <th>Strategy</th>
                  <th>Status</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No orders found</td></tr>
                ) : orders.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="td-primary" style={{ fontSize: 12 }}>
                      {users.find(u => String(u._id) === String(o.userId))?.name || String(o.userId).slice(-6)}
                    </td>
                    <td className="td-primary">{o.symbol}</td>
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: o.action === 'BUY' ? 'var(--green)' : 'var(--red)' }}>
                        {o.action}
                      </span>
                    </td>
                    <td>{o.qty}</td>
                    <td style={{ fontSize: 12 }}>
                      {o.fillPrice ? `₹${o.fillPrice.toLocaleString('en-IN')}` : `₹${(o.price || 0).toLocaleString('en-IN')}`}
                    </td>
                    <td><span className={`badge badge-${o.userLabel}`}>{o.userLabel}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{o.strategyName || '—'}</td>
                    <td>
                      <span className={`badge ${
                        o.status === 'executed' ? 'badge-green' :
                        o.status === 'rejected' ? 'badge-red'   : 'badge-gray'
                      }`}>{o.status}</span>
                    </td>
                    <td>
                      {o.isPaper && <span className="badge badge-amber">paper</span>}
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
