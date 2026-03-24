import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { getMyStrategies, toggleStrategyMode } from '../../services/userApi'
import { useToast } from '../../context/ToastContext'

const DESC = {
  'EMA Crossover':           { icon: '📈', color: '#534AB7', tf: '5min' },
  'RSI Overbought/Oversold': { icon: '📊', color: '#378ADD', tf: '15min' },
  'MACD Signal Cross':       { icon: '⚡', color: '#7F77DD', tf: '15min' },
  'Supertrend':              { icon: '🌊', color: '#1D9E75', tf: '5min' },
  'Bollinger Bands':         { icon: '〰',  color: '#EF9F27', tf: '15min' },
  'Opening Range Breakout':  { icon: '🌅', color: '#E24B4A', tf: '1min'  },
}

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState([])
  const [loading,    setLoading]    = useState(true)
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await getMyStrategies()
      setStrategies(data)
    } catch { toast.error('Failed to load strategies') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleModeToggle = async (assignment) => {
    const newMode = assignment.tradingMode === 'live' ? 'paper' : 'live'
    try {
      await toggleStrategyMode(assignment._id, newMode)
      toast.success(`Switched to ${newMode} mode`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to switch mode')
    }
  }

  return (
    <>
      <Topbar title="My strategies" subtitle={`${strategies.length} assigned to you`} />
      <div className="page-body">

        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading…</div>
        ) : strategies.length === 0 ? (
          <div className="glass p-20" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 6 }}>No strategies assigned yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Your admin will assign strategies based on your plan</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {strategies.map(a => {
              const name  = a.strategyId?.name || '—'
              const meta  = DESC[name] || { icon: '📌', color: '#AFA9EC', tf: '—' }
              const isLive= a.tradingMode === 'live'
              const cfg   = { ...a.strategyId?.defaultConfig, ...a.config }

              return (
                <div key={a._id} className="glass p-16" style={{ borderTop: `3px solid ${meta.color}` }}>
                  {/* header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${meta.color}22`, border: `1px solid ${meta.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                      {meta.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{meta.tf} timeframe</div>
                    </div>
                    <span className={`badge ${a.isActive ? 'badge-green' : 'badge-gray'}`}>
                      {a.isActive ? 'active' : 'paused'}
                    </span>
                  </div>

                  {/* description */}
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.5 }}>
                    {a.strategyId?.description?.slice(0, 90) || '—'}
                  </div>

                  {/* config */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 14 }}>
                    {[
                      { label: 'Symbol',  val: cfg.symbol  || '—' },
                      { label: 'Qty',     val: cfg.qty     || '—' },
                      { label: 'Product', val: cfg.orderType || '—' },
                    ].map(item => (
                      <div key={item.label} style={{ padding: '6px 8px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, textAlign: 'center' }}>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</div>
                        <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', marginTop: 2 }}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* mode toggle */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Mode</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: isLive ? 'var(--green)' : 'var(--amber)', marginTop: 1, textTransform: 'uppercase' }}>
                        {a.tradingMode}
                      </div>
                    </div>
                    <button
                      onClick={() => handleModeToggle(a)}
                      className={`btn btn-sm ${isLive ? 'btn-ghost' : 'btn-ghost'}`}
                      style={{ borderColor: isLive ? 'rgba(239,159,39,0.3)' : 'rgba(29,158,117,0.3)', color: isLive ? 'var(--amber)' : 'var(--green)' }}>
                      Switch to {isLive ? 'paper' : 'live'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* info note */}
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.18)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)' }}>
          Strategies are assigned by your admin based on your plan. To request more strategies, contact your account manager.
        </div>
      </div>
    </>
  )
}
