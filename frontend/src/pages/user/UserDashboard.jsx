import { useEffect, useState } from 'react'
import Topbar   from '../../components/common/Topbar'
import StatCard from '../../components/common/StatCard'
import { getDashboard, getPositions } from '../../services/userApi'
import { useSocket } from '../../hooks/useSocket'
import { useAuth }   from '../../context/AuthContext'

export default function UserDashboard() {
  const [data,      setData]      = useState(null)
  const [positions, setPositions] = useState([])
  const [loading,   setLoading]   = useState(true)
  const { prices }  = useSocket()
  const { user }    = useAuth()

  const load = async () => {
    try {
      const [d, p] = await Promise.all([getDashboard(), getPositions()])
      setData(d.data)
      setPositions(p.data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const pnlColor = data?.todayPnL >= 0 ? 'var(--green)' : 'var(--red)'
  const pnlFmt   = data?.todayPnL != null
    ? `${data.todayPnL >= 0 ? '+' : ''}₹${Math.abs(data.todayPnL).toLocaleString('en-IN')}`
    : '—'

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <>
      <Topbar title="My dashboard" subtitle={today} />
      <div className="page-body">

        {/* stats */}
        <div className="grid-4 mb-24">
          <div className="glass stat-card blue">
            <div className="stat-label">Today's P&L</div>
            <div className="stat-value" style={{ color: data ? pnlColor : '#fff' }}>{pnlFmt}</div>
            <div className={`stat-sub ${data?.todayPnL >= 0 ? 'pos' : 'neg'}`}>
              {data ? `${data.todayTrades} trades today` : '—'}
            </div>
          </div>
          <StatCard
            label="Algo trades"
            value={data?.algoToday ?? '—'}
            sub={`${data?.manualToday ?? 0} manual`}
            color="purple"
          />
          <StatCard
            label="Open positions"
            value={positions.length}
            sub="live + paper"
            color="green"
          />
          <StatCard
            label="Strategies active"
            value={data?.strategies?.length ?? '—'}
            sub="assigned to me"
            color="amber"
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          {/* positions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="glass p-16">
              <div className="flex items-center justify-between mb-16">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Open positions</div>
                <button className="btn btn-ghost btn-sm" onClick={load}>Refresh</button>
              </div>
              {loading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
              ) : positions.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No open positions</div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Symbol</th><th>Type</th><th>Qty</th><th>Avg price</th><th>LTP</th><th>P&L</th></tr>
                    </thead>
                    <tbody>
                      {positions.map((p, i) => {
                        const sym = p.tradingsymbol || p.symbol || '—'
                        const livePrice = prices[sym]?.ltp
                        const avgPrice  = parseFloat(p.averageprice || p.avgPrice || 0)
                        const qty       = parseInt(p.netqty || p.netQty || p.qty || 0)
                        const ltp       = livePrice || parseFloat(p.ltp || 0)
                        const pnl       = qty * (ltp - avgPrice)
                        return (
                          <tr key={i}>
                            <td className="td-primary">{sym}</td>
                            <td><span className="badge badge-gray">{p.product || p.productType || 'MIS'}</span></td>
                            <td>{qty}</td>
                            <td>₹{avgPrice.toLocaleString('en-IN')}</td>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                              ₹{ltp.toLocaleString('en-IN')}
                            </td>
                            <td style={{ color: pnl >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 500 }}>
                              {pnl >= 0 ? '+' : ''}₹{Math.abs(pnl).toFixed(0)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* recent orders */}
            <div className="glass p-16">
              <div className="flex items-center justify-between mb-16">
                <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Recent trades</div>
                <a href="/dashboard/history" style={{ fontSize: 11, color: 'rgba(127,119,221,0.8)', textDecoration: 'none' }}>View all →</a>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Symbol</th><th>Label</th><th>Action</th><th>Qty</th><th>Price</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {(data?.recentOrders || []).slice(0, 6).map(o => (
                      <tr key={o._id}>
                        <td className="td-primary">{o.symbol}</td>
                        <td><span className={`badge badge-${o.userLabel}`}>{o.userLabel}</span></td>
                        <td style={{ color: o.action === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{o.action}</td>
                        <td>{o.qty}</td>
                        <td>₹{(o.fillPrice || o.price || 0).toLocaleString('en-IN')}</td>
                        <td><span className={`badge ${o.status === 'executed' ? 'badge-green' : o.status === 'rejected' ? 'badge-red' : 'badge-gray'}`}>{o.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* right: strategies + brokers */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* strategies */}
            <div className="glass p-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
                My strategies
                <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6, fontWeight: 400 }}>
                  {data?.strategies?.length || 0} assigned
                </span>
              </div>
              {(data?.strategies || []).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: '10px 0' }}>No strategies assigned yet</div>
              ) : (data?.strategies || []).map(a => (
                <div key={a._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: a.isActive ? 'var(--green)' : 'rgba(255,255,255,0.15)', flexShrink: 0 }}/>
                  <div style={{ flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    {a.strategyId?.name || '—'}
                  </div>
                  <span className={`badge ${a.tradingMode === 'live' ? 'badge-green' : 'badge-amber'}`}>
                    {a.tradingMode}
                  </span>
                </div>
              ))}
            </div>

            {/* brokers */}
            <div className="glass p-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Broker connections</div>
              {(data?.brokers || []).length === 0 ? (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>No brokers connected yet</div>
              ) : (data?.brokers || []).map(b => (
                <div key={b._id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1, textTransform: 'capitalize' }}>{b.broker}</span>
                  <span className={`badge ${b.isConnected ? 'badge-green' : 'badge-gray'}`}>
                    {b.isConnected ? 'connected' : 'not connected'}
                  </span>
                </div>
              ))}
              <a href="/dashboard/brokers" style={{ display: 'block', marginTop: 10, textAlign: 'center', fontSize: 12, color: 'rgba(127,119,221,0.8)', textDecoration: 'none', padding: '7px', background: 'rgba(83,74,183,0.08)', borderRadius: 8, border: '1px solid rgba(83,74,183,0.18)' }}>
                Manage brokers →
              </a>
            </div>

            {/* mode */}
            <div className="glass p-16" style={{ borderLeft: `3px solid ${user?.tradingMode === 'live' ? 'var(--green)' : 'var(--amber)'}` }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Current trading mode</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: user?.tradingMode === 'live' ? 'var(--green)' : 'var(--amber)', textTransform: 'uppercase' }}>
                {user?.tradingMode || 'paper'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                {user?.tradingMode === 'live' ? 'Real money · Real broker' : 'Simulation · No real orders'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
