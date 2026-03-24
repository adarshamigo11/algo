import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { placeOrder, getOrderBook, cancelOrder, searchInstruments } from '../../services/userApi'
import { useSocket } from '../../hooks/useSocket'
import { useToast }  from '../../context/ToastContext'
import { useAuth }   from '../../context/AuthContext'

const EMPTY = {
  symbol: '', token: '', exchange: 'NSE',
  action: 'BUY', orderType: 'MARKET', productType: 'MIS', qty: 1, price: '',
}

export default function OrderPage() {
  const [form,       setForm]       = useState(EMPTY)
  const [orders,     setOrders]     = useState([])
  const [results,    setResults]    = useState([])
  const [searchQ,    setSearchQ]    = useState('')
  const [searching,  setSearching]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { prices }  = useSocket()
  const toast       = useToast()
  const { user }    = useAuth()

  const loadOrders = async () => {
    try {
      const { data } = await getOrderBook()
      setOrders(data)
    } catch { }
  }

  useEffect(() => { loadOrders() }, [])

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchInstruments(searchQ, form.exchange)
        setResults(data)
      } catch { }
      setSearching(false)
    }, 350)
    return () => clearTimeout(t)
  }, [searchQ, form.exchange])

  const selectInstrument = (inst) => {
    setForm(f => ({ ...f, symbol: inst.symbol, token: inst.token, exchange: inst.exchange }))
    setSearchQ(inst.symbol)
    setResults([])
  }

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.symbol) { toast.error('Select an instrument'); return }
    setSubmitting(true)
    try {
      await placeOrder({ ...form, qty: parseInt(form.qty), price: parseFloat(form.price) || 0 })
      toast.success(`${form.action} order placed — ${form.qty} ${form.symbol}`)
      setForm(EMPTY); setSearchQ('')
      loadOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed')
    } finally { setSubmitting(false) }
  }

  const handleCancel = async (id) => {
    try {
      await cancelOrder(id)
      toast.success('Order cancelled')
      loadOrders()
    } catch { toast.error('Cancel failed') }
  }

  const livePrice = form.symbol ? prices[form.symbol]?.ltp : null
  const buyActive  = form.action === 'BUY'
  const sellActive = form.action === 'SELL'

  return (
    <>
      <Topbar title="Place order" subtitle={user?.tradingMode === 'paper' ? 'Paper trading mode — no real money' : 'Live trading'} />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: 16 }}>

          <div className="glass p-20">
            {user?.tradingMode === 'paper' && (
              <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--amber)' }}>
                Paper mode — simulated orders only
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="field" style={{ position: 'relative' }}>
                <label>Instrument</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input className="input" placeholder="Search — e.g. NIFTY, RELIANCE"
                      value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    {searching && <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>…</span>}
                    {results.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0e1426', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 180, overflowY: 'auto' }}>
                        {results.map(inst => (
                          <div key={inst.token} onClick={() => selectInstrument(inst)}
                            style={{ padding: '7px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: 500, color: '#fff' }}>{inst.symbol}</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <span className="badge badge-gray">{inst.exchange}</span>
                              {inst.optionType && <span className="badge badge-algo">{inst.optionType}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <select className="input" style={{ width: 80 }} value={form.exchange} onChange={e => f('exchange', e.target.value)}>
                    {['NSE','BSE','NFO','MCX','CDS'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
                {livePrice && (
                  <div style={{ marginTop: 6, fontSize: 12, color: 'var(--green)' }}>
                    LTP: ₹{livePrice.toLocaleString('en-IN')}
                  </div>
                )}
              </div>

              <div className="field">
                <label>Action</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => f('action', 'BUY')} style={{
                    flex: 1, padding: 9, borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
                    background: buyActive  ? 'rgba(29,158,117,0.2)'  : 'rgba(255,255,255,0.05)',
                    color:      buyActive  ? 'var(--green)' : 'var(--text-muted)',
                    border:     buyActive  ? '1px solid rgba(29,158,117,0.35)' : '1px solid var(--border)',
                  }}>BUY</button>
                  <button type="button" onClick={() => f('action', 'SELL')} style={{
                    flex: 1, padding: 9, borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 14, fontWeight: 600,
                    background: sellActive ? 'rgba(226,75,74,0.18)' : 'rgba(255,255,255,0.05)',
                    color:      sellActive ? 'var(--red)'   : 'var(--text-muted)',
                    border:     sellActive ? '1px solid rgba(226,75,74,0.3)'  : '1px solid var(--border)',
                  }}>SELL</button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div className="field">
                  <label>Order type</label>
                  <select className="input" value={form.orderType} onChange={e => f('orderType', e.target.value)}>
                    {['MARKET','LIMIT','SL','SL-M'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Product</label>
                  <select className="input" value={form.productType} onChange={e => f('productType', e.target.value)}>
                    {['MIS','CNC','NRML'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Quantity</label>
                  <input className="input" type="number" min="1" value={form.qty} onChange={e => f('qty', e.target.value)} />
                </div>
                <div className="field">
                  <label>Price</label>
                  <input className="input" type="number" step="0.05" placeholder="0.00"
                    value={form.price} onChange={e => f('price', e.target.value)}
                    disabled={form.orderType === 'MARKET'} />
                </div>
              </div>

              <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: 11 }}
                type="submit" disabled={submitting}>
                {submitting ? 'Placing…' : `${form.action} ${form.qty} ${form.symbol || 'order'}`}
              </button>
            </form>
          </div>

          <div className="glass p-16">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)' }}>Order book</div>
              <button className="btn btn-ghost btn-sm" onClick={loadOrders}>Refresh</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Symbol</th><th>Action</th><th>Qty</th><th>Type</th><th>Price</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>No orders today</td></tr>
                  ) : orders.map(o => (
                    <tr key={o._id}>
                      <td className="td-primary">{o.symbol}</td>
                      <td style={{ color: o.action === 'BUY' ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>{o.action}</td>
                      <td>{o.qty}</td>
                      <td><span className="badge badge-gray">{o.orderType}</span></td>
                      <td>₹{(o.fillPrice || o.price || 0).toLocaleString('en-IN')}</td>
                      <td><span className={`badge ${o.status === 'executed' ? 'badge-green' : o.status === 'rejected' ? 'badge-red' : 'badge-gray'}`}>{o.status}</span></td>
                      <td>
                        {(o.status === 'pending' || o.status === 'open') && (
                          <button className="btn btn-danger btn-sm" onClick={() => handleCancel(o._id)}>Cancel</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}