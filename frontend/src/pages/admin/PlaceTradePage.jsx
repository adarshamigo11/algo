import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { getUsers, searchInstruments } from '../../services/api'
import { useToast } from '../../context/ToastContext'
import api from '../../services/api'

const EMPTY = {
  userId: '', symbol: '', token: '', exchange: 'NSE',
  action: 'BUY', orderType: 'MARKET', productType: 'MIS', qty: 1, price: '',
}

export default function PlaceTradePage() {
  const [users,      setUsers]      = useState([])
  const [form,       setForm]       = useState(EMPTY)
  const [results,    setResults]    = useState([])
  const [searchQ,    setSearchQ]    = useState('')
  const [searching,  setSearching]  = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [lastOrder,  setLastOrder]  = useState(null)
  const toast = useToast()

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users'))
  }, [])

  useEffect(() => {
    if (searchQ.length < 2) { setResults([]); return }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const { data } = await searchInstruments(searchQ, form.exchange)
        setResults(data)
      } catch { }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [searchQ, form.exchange])

  const selectInstrument = (inst) => {
    setForm(f => ({ ...f, symbol: inst.symbol, token: inst.token, exchange: inst.exchange }))
    setSearchQ(inst.symbol)
    setResults([])
  }

  const f = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.userId) { toast.error('Select a user'); return }
    if (!form.symbol) { toast.error('Select an instrument'); return }
    setSubmitting(true)
    try {
      const { data } = await api.post('/admin/orders', {
        ...form, qty: parseInt(form.qty), price: parseFloat(form.price) || 0,
      })
      setLastOrder(data)
      toast.success(`Order placed — ${form.action} ${form.qty} ${form.symbol}`)
      setForm(EMPTY); setSearchQ('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed')
    } finally { setSubmitting(false) }
  }

  const selectedUser = users.find(u => u._id === form.userId)

  const buyActive  = form.action === 'BUY'
  const sellActive = form.action === 'SELL'

  return (
    <>
      <Topbar title="Place trade" subtitle="Execute on behalf of any user — shown as ALGO label" />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>

          <div className="glass p-20">
            <form onSubmit={handleSubmit}>

              <div className="field">
                <label>Select user</label>
                <select className="input" value={form.userId} onChange={e => f('userId', e.target.value)} required>
                  <option value="">— choose a user —</option>
                  {users.map(u => <option key={u._id} value={u._id}>{u.name} · {u.email}</option>)}
                </select>
              </div>

              {selectedUser && (
                <div style={{ marginBottom: 14, padding: '8px 12px', background: 'rgba(83,74,183,0.1)', border: '1px solid rgba(83,74,183,0.2)', borderRadius: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Mode: </span>
                  <span className={`badge badge-${selectedUser.tradingMode === 'live' ? 'green' : 'amber'}`}>{selectedUser.tradingMode}</span>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 10 }}>Plan: </span>
                  <span style={{ color: '#AFA9EC', textTransform: 'capitalize' }}>{selectedUser.plan}</span>
                </div>
              )}

              <div className="field" style={{ position: 'relative' }}>
                <label>Instrument</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, position: 'relative' }}>
                    <input className="input" placeholder="Search symbol… e.g. NIFTY, RELIANCE"
                      value={searchQ} onChange={e => setSearchQ(e.target.value)} />
                    {results.length > 0 && (
                      <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50, background: '#0e1426', border: '1px solid var(--border)', borderRadius: 8, marginTop: 4, maxHeight: 200, overflowY: 'auto' }}>
                        {results.map(inst => (
                          <div key={inst.token} onClick={() => selectInstrument(inst)}
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 12, borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <span style={{ fontWeight: 500, color: '#fff' }}>{inst.symbol}</span>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <span className="badge badge-gray">{inst.exchange}</span>
                              {inst.optionType && <span className="badge badge-algo">{inst.optionType}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {searching && <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: 'var(--text-muted)' }}>searching…</div>}
                  </div>
                  <select className="input" style={{ width: 90 }} value={form.exchange} onChange={e => f('exchange', e.target.value)}>
                    {['NSE','BSE','NFO','MCX','CDS'].map(x => <option key={x}>{x}</option>)}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Action</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={() => f('action', 'BUY')} style={{
                    flex: 1, padding: 9, borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                    background: buyActive ? 'rgba(29,158,117,0.25)' : 'rgba(255,255,255,0.05)',
                    color:      buyActive ? 'var(--green)' : 'var(--text-muted)',
                    border:     buyActive ? '1px solid rgba(29,158,117,0.4)' : '1px solid var(--border)',
                  }}>BUY</button>
                  <button type="button" onClick={() => f('action', 'SELL')} style={{
                    flex: 1, padding: 9, borderRadius: 8, cursor: 'pointer',
                    fontFamily: 'var(--font)', fontSize: 13, fontWeight: 600,
                    background: sellActive ? 'rgba(226,75,74,0.2)' : 'rgba(255,255,255,0.05)',
                    color:      sellActive ? 'var(--red)' : 'var(--text-muted)',
                    border:     sellActive ? '1px solid rgba(226,75,74,0.35)' : '1px solid var(--border)',
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
                  <label>Price {form.orderType === 'MARKET' && '(ignored)'}</label>
                  <input className="input" type="number" step="0.05" placeholder="0.00"
                    value={form.price} onChange={e => f('price', e.target.value)}
                    disabled={form.orderType === 'MARKET'} />
                </div>
              </div>

              <div style={{ padding: '10px 14px', background: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                This trade will appear as <span className="badge badge-algo" style={{ margin: '0 4px' }}>algo</span> on the user's dashboard
              </div>

              <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: 12 }}
                type="submit" disabled={submitting}>
                {submitting ? 'Placing order…' : `Place ${form.action} order`}
              </button>
            </form>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {lastOrder && (
              <div className="glass p-16" style={{ borderLeft: '3px solid var(--green)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Order placed</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{form.symbol}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  Status: <span className="badge badge-green">accepted</span>
                </div>
              </div>
            )}
            <div className="glass p-16">
              <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>Quick reference</div>
              {[
                { label: 'MIS',    desc: 'Intraday — auto closes 3:10 PM' },
                { label: 'CNC',    desc: 'Delivery — stays in holdings' },
                { label: 'NRML',   desc: 'F&O overnight positions' },
                { label: 'MARKET', desc: 'Executes at current price' },
                { label: 'LIMIT',  desc: 'Executes at your price or better' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 10, padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', alignItems: 'flex-start' }}>
                  <span className="badge badge-gray" style={{ flexShrink: 0 }}>{item.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{item.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}