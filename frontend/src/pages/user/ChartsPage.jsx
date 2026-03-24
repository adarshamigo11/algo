import { useEffect, useState, useRef } from 'react'
import Topbar from '../../components/common/Topbar'
import { searchInstruments, getCandles } from '../../services/userApi'
import { useSocket } from '../../hooks/useSocket'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const INTERVALS = [
  { label: '1m',  value: 'ONE_MINUTE' },
  { label: '5m',  value: 'FIVE_MINUTE' },
  { label: '15m', value: 'FIFTEEN_MINUTE' },
  { label: '1D',  value: 'ONE_DAY' },
]

const WATCHLIST = [
  { symbol: 'NIFTY',      token: '26000', exchange: 'NSE' },
  { symbol: 'BANKNIFTY',  token: '26009', exchange: 'NSE' },
  { symbol: 'RELIANCE',   token: '2885',  exchange: 'NSE' },
  { symbol: 'TCS',        token: '11536', exchange: 'NSE' },
  { symbol: 'HDFC',       token: '1333',  exchange: 'NSE' },
  { symbol: 'INFY',       token: '1594',  exchange: 'NSE' },
]

export default function ChartsPage() {
  const [selected,  setSelected]  = useState(WATCHLIST[0])
  const [interval,  setInterval]  = useState('FIVE_MINUTE')
  const [candles,   setCandles]   = useState([])
  const [loading,   setLoading]   = useState(false)
  const [searchQ,   setSearchQ]   = useState('')
  const [results,   setResults]   = useState([])
  const { prices }  = useSocket()

  const livePrice = prices[selected.symbol]

  const loadCandles = async (inst, iv) => {
    if (!inst?.token) return
    setLoading(true)
    try {
      const { data } = await getCandles(inst.token, inst.exchange, iv)
      setCandles(data)
    } catch { setCandles([]) }
    finally { setLoading(false) }
  }

  useEffect(() => { loadCandles(selected, interval) }, [selected, interval])

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      try {
        const { data } = await searchInstruments(searchQ, 'NSE')
        setResults(data.slice(0, 8))
      } catch { setResults([]) }
    }, 350)
    return () => clearTimeout(t)
  }, [searchQ])

  const selectInst = (inst) => {
    setSelected({ symbol: inst.symbol, token: inst.token, exchange: inst.exchange })
    setSearchQ(''); setResults([])
  }

  const chartData = candles.map(c => ({
    time:  new Date(c.time * 1000).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    price: c.close,
    open:  c.open, high: c.high, low: c.low, vol: c.volume,
  }))

  const isUp = candles.length >= 2 && candles[candles.length - 1]?.close >= candles[0]?.close
  const lineColor = isUp ? '#5DCAA5' : '#E24B4A'

  const change = livePrice && candles.length
    ? ((livePrice.ltp - candles[0]?.close) / candles[0]?.close * 100).toFixed(2)
    : null

  return (
    <>
      <Topbar title="Live charts" subtitle="Powered by Angel One WebSocket" />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 16 }}>

          {/* watchlist */}
          <div className="glass p-14">
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <input className="input" placeholder="Search…" style={{ fontSize: 12, padding: '7px 10px' }}
                value={searchQ} onChange={e => setSearchQ(e.target.value)} />
              {results.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0e1426', border: '1px solid var(--border)', borderRadius: 8, marginTop: 3, maxHeight: 180, overflowY: 'auto' }}>
                  {results.map(r => (
                    <div key={r.token} onClick={() => selectInst(r)}
                      style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12, color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      {r.symbol} <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>{r.exchange}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {WATCHLIST.map(w => {
              const live = prices[w.symbol]
              const isSelected = selected.symbol === w.symbol
              return (
                <div key={w.symbol} onClick={() => setSelected(w)} style={{
                  padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: isSelected ? 'rgba(83,74,183,0.18)' : 'transparent',
                  border: `1px solid ${isSelected ? 'rgba(83,74,183,0.3)' : 'transparent'}`,
                }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{w.symbol}</div>
                  <div style={{ fontSize: 11, color: live ? 'var(--green)' : 'var(--text-muted)', marginTop: 1 }}>
                    {live ? `₹${live.ltp?.toLocaleString('en-IN')}` : '—'}
                  </div>
                </div>
              )
            })}
          </div>

          {/* chart area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

            {/* header */}
            <div className="glass p-16" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>{selected.symbol}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{selected.exchange}</div>
              </div>
              {livePrice && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 600, color: '#fff' }}>
                    ₹{livePrice.ltp?.toLocaleString('en-IN')}
                  </div>
                  {change !== null && (
                    <div style={{ fontSize: 12, color: parseFloat(change) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {parseFloat(change) >= 0 ? '+' : ''}{change}%
                    </div>
                  )}
                </div>
              )}
              {/* interval tabs */}
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 3, gap: 2 }}>
                {INTERVALS.map(iv => (
                  <button key={iv.value} onClick={() => setInterval(iv.value)} style={{
                    padding: '5px 10px', borderRadius: 6, fontSize: 12, border: 'none',
                    fontFamily: 'var(--font)', cursor: 'pointer',
                    background: interval === iv.value ? 'var(--accent-grad)' : 'transparent',
                    color: interval === iv.value ? '#fff' : 'var(--text-muted)',
                  }}>{iv.label}</button>
                ))}
              </div>
            </div>

            {/* chart */}
            <div className="glass p-16">
              {loading ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>Loading chart…</div>
              ) : chartData.length === 0 ? (
                <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>No data available</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={lineColor} stopOpacity={0.25}/>
                        <stop offset="95%" stopColor={lineColor} stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="time" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto','auto']}
                      tickFormatter={v => `₹${v.toLocaleString('en-IN')}`} width={70} />
                    <Tooltip
                      contentStyle={{ background: '#0e1426', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                      labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                      formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Price']}
                    />
                    <Area type="monotone" dataKey="price" stroke={lineColor} strokeWidth={1.5}
                      fill="url(#priceGrad)" dot={false} activeDot={{ r: 3, fill: lineColor }} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* OHLC bar */}
            {candles.length > 0 && (() => {
              const last = candles[candles.length - 1]
              return (
                <div className="glass" style={{ padding: '10px 16px', display: 'flex', gap: 24 }}>
                  {[
                    { label: 'Open',   val: last.open  },
                    { label: 'High',   val: last.high,  color: 'var(--green)' },
                    { label: 'Low',    val: last.low,   color: 'var(--red)'   },
                    { label: 'Close',  val: last.close  },
                    { label: 'Volume', val: last.volume?.toLocaleString('en-IN') },
                  ].map(item => (
                    <div key={item.label}>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{item.label}</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: item.color || '#fff', marginTop: 1 }}>
                        {item.label === 'Volume' ? item.val : `₹${Number(item.val).toLocaleString('en-IN')}`}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </>
  )
}
