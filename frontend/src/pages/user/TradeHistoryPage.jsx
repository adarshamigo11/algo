import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { getTradeHistory } from '../../services/userApi'
import { useToast } from '../../context/ToastContext'

export default function TradeHistoryPage() {
  const [trades,  setTrades]  = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ label: '', symbol: '', limit: 100 })
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getTradeHistory({
        label:  filters.label  || undefined,
        symbol: filters.symbol || undefined,
        limit:  filters.limit,
      })
      setTrades(data)
    } catch { toast.error('Failed to load trade history') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filters])

  const f = (k, v) => setFilters(p => ({ ...p, [k]: v }))

  // simple P&L calc
  const totalPnL = trades.reduce((sum, t) => {
    if (t.status !== 'executed' || !t.fillPrice) return sum
    const val = t.fillPrice * t.qty
    return sum + (t.action === 'SELL' ? val : -val)
  }, 0)

  // CSV download
  const downloadCSV = () => {
    const headers = ['Date','Symbol','Exchange','Action','Qty','Price','Fill Price','Type','Product','Status','Label','Strategy','Paper']
    const rows = trades.map(t => [
      new Date(t.createdAt).toLocaleString('en-IN'),
      t.symbol, t.exchange, t.action, t.qty,
      t.price || 0, t.fillPrice || 0,
      t.orderType, t.productType, t.status,
      t.userLabel, t.strategyName || '', t.isPaper ? 'Yes' : 'No',
    ])
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a'); a.href = url
    a.download = `trades_${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  return (
    <>
      <Topbar title="Trade history" subtitle={`${trades.length} trades`} />
      <div className="page-body">

        {/* summary */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div className="glass" style={{ padding: '12px 16px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Total trades</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#fff' }}>{trades.length}</div>
          </div>
          <div className="glass" style={{ padding: '12px 16px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Algo trades</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#AFA9EC' }}>{trades.filter(t => t.userLabel === 'algo').length}</div>
          </div>
          <div className="glass" style={{ padding: '12px 16px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Manual trades</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: '#85B7EB' }}>{trades.filter(t => t.userLabel === 'manual').length}</div>
          </div>
          <div className="glass" style={{ padding: '12px 16px', flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Approx P&L</div>
            <div style={{ fontSize: 20, fontWeight: 600, color: totalPnL >= 0 ? 'var(--green)' : 'var(--red)' }}>
              {totalPnL >= 0 ? '+' : ''}₹{Math.abs(totalPnL).toFixed(0)}
            </div>
          </div>
        </div>

        {/* filters */}
        <div className="flex gap-12 mb-16" style={{ flexWrap: 'wrap' }}>
          <select className="input" style={{ width: 140 }} value={filters.label} onChange={e => f('label', e.target.value)}>
            <option value="">All labels</option>
            <option value="algo">Algo</option>
            <option value="manual">Manual</option>
          </select>
          <input className="input" style={{ width: 160 }} placeholder="Filter by symbol"
            value={filters.symbol} onChange={e => f('symbol', e.target.value)} />
          <select className="input" style={{ width: 120 }} value={filters.limit} onChange={e => f('limit', Number(e.target.value))}>
            <option value={100}>Last 100</option>
            <option value={200}>Last 200</option>
            <option value={500}>Last 500</option>
          </select>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
          <button className="btn btn-ghost" onClick={downloadCSV} style={{ marginLeft: 'auto' }}>
            Download CSV
          </button>
        </div>

        {/* table */}
        <div className="glass">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date / Time</th>
                  <th>Symbol</th>
                  <th>Label</th>
                  <th>Action</th>
                  <th>Qty</th>
                  <th>Fill price</th>
                  <th>Product</th>
                  <th>Strategy</th>
                  <th>Status</th>
                  <th>Mode</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</td></tr>
                ) : trades.length === 0 ? (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No trades found</td></tr>
                ) : trades.map(t => (
                  <tr key={t._id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(t.createdAt).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                    </td>
                    <td className="td-primary">{t.symbol}</td>
                    <td><span className={`badge badge-${t.userLabel}`}>{t.userLabel}</span></td>
                    <td style={{ color: t.action === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{t.action}</td>
                    <td>{t.qty}</td>
                    <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                      ₹{(t.fillPrice || t.price || 0).toLocaleString('en-IN')}
                    </td>
                    <td><span className="badge badge-gray">{t.productType}</span></td>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{t.strategyName || '—'}</td>
                    <td>
                      <span className={`badge ${t.status === 'executed' ? 'badge-green' : t.status === 'rejected' ? 'badge-red' : 'badge-gray'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      {t.isPaper
                        ? <span className="badge badge-amber">paper</span>
                        : <span className="badge badge-gray">live</span>
                      }
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
