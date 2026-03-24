import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import Modal  from '../../components/common/Modal'
import { getMyBrokers, connectAngelOne, getZerodhaLoginURL, disconnectMyBroker } from '../../services/userApi'
import { useToast } from '../../context/ToastContext'

const BROKERS = [
  { key: 'angelone', name: 'Angel One',  color: '#FF8C00', initial: 'A1', type: 'manual' },
  { key: 'zerodha',  name: 'Zerodha',   color: '#387ED1', initial: 'ZR', type: 'oauth'  },
  { key: 'upstox',   name: 'Upstox',    color: '#6355D8', initial: 'UP', type: 'oauth'  },
]

export default function UserBrokersPage() {
  const [accounts, setAccounts] = useState([])
  const [modal,    setModal]    = useState(null)
  const [form,     setForm]     = useState({})
  const [loading,  setLoading]  = useState(false)
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await getMyBrokers()
      setAccounts(data)
    } catch { toast.error('Failed to load brokers') }
  }

  useEffect(() => { load() }, [])

  const getAccount = (broker) => accounts.find(a => a.broker === broker)

  const handleAngelOneConnect = async () => {
    setLoading(true)
    try {
      await connectAngelOne({ ...form })
      toast.success('Angel One connected!')
      setModal(null); setForm({}); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Connection failed')
    } finally { setLoading(false) }
  }

  const handleZerodhaConnect = async () => {
    try {
      const { data } = await getZerodhaLoginURL()
      window.open(data.url, '_blank')
      toast.info('Complete login in the new tab, then refresh this page')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to get login URL')
    }
  }

  const handleDisconnect = async (broker) => {
    if (!window.confirm(`Disconnect ${broker}?`)) return
    try {
      await disconnectMyBroker(broker)
      toast.success('Disconnected'); load()
    } catch { toast.error('Failed') }
  }

  return (
    <>
      <Topbar title="Broker connections" subtitle="Connect your Demat accounts" />
      <div className="page-body">

        <div style={{ maxWidth: 640 }}>
          {/* info banner */}
          <div style={{ padding: '12px 16px', background: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.18)', borderRadius: 10, fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Connect your broker account so trades can be placed on your behalf. Your credentials are encrypted with AES-256 and never shared. Your broker account remains under your full control at all times.
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {BROKERS.map(b => {
              const account   = getAccount(b.key)
              const connected = account?.isConnected

              return (
                <div key={b.key} className="glass p-16" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {/* icon */}
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${b.color}18`, border: `1px solid ${b.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: b.color, flexShrink: 0 }}>
                    {b.initial}
                  </div>

                  {/* info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{b.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {connected
                        ? `Connected · refreshed ${account.lastRefresh ? new Date(account.lastRefresh).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—'}`
                        : b.type === 'oauth' ? 'OAuth login — you\'ll be redirected to broker login'
                        : 'Enter your API credentials to connect'}
                    </div>
                  </div>

                  {/* status */}
                  <span className={`badge ${connected ? 'badge-green' : 'badge-gray'}`}>
                    {connected ? 'connected' : 'not connected'}
                  </span>

                  {/* action */}
                  {connected
                    ? <button className="btn btn-danger btn-sm" onClick={() => handleDisconnect(b.key)}>Disconnect</button>
                    : b.key === 'angelone'
                      ? <button className="btn btn-ghost btn-sm" onClick={() => { setModal('angelone'); setForm({}) }}>Connect</button>
                      : b.key === 'zerodha'
                        ? <button className="btn btn-ghost btn-sm" onClick={handleZerodhaConnect}>Connect via OAuth</button>
                        : <button className="btn btn-ghost btn-sm" disabled style={{ opacity: 0.4 }}>Coming soon</button>
                  }
                </div>
              )
            })}
          </div>

          {/* what happens note */}
          <div style={{ marginTop: 24, padding: '14px 16px', background: 'rgba(29,158,117,0.07)', border: '1px solid rgba(29,158,117,0.15)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--green)', marginBottom: 6 }}>What happens after connecting?</div>
            {[
              'Your broker account token is securely stored and refreshed every morning at 8 AM',
              'Automated strategies will start placing trades in your account',
              'Every trade appears in your broker app AND on this dashboard',
              'You can disconnect at any time — all pending orders will be cancelled',
            ].map((text, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Angel One modal */}
      {modal === 'angelone' && (
        <Modal title="Connect Angel One" onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAngelOneConnect} disabled={loading}>
                {loading ? 'Connecting…' : 'Connect'}
              </button>
            </>
          }>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.6 }}>
            Your credentials are encrypted before storage. We use them only to place orders on your behalf.
          </div>
          <div className="field"><label>Client ID</label>
            <input className="input" value={form.clientId||''} onChange={e => setForm({...form,clientId:e.target.value})} placeholder="A12345678" /></div>
          <div className="field"><label>API Key</label>
            <input className="input" value={form.apiKey||''} onChange={e => setForm({...form,apiKey:e.target.value})} /></div>
          <div className="field"><label>MPIN</label>
            <input className="input" type="password" value={form.pin||''} onChange={e => setForm({...form,pin:e.target.value})} /></div>
          <div className="field"><label>TOTP Secret (from authenticator app)</label>
            <input className="input" value={form.totpSecret||''} onChange={e => setForm({...form,totpSecret:e.target.value})} placeholder="Base32 secret key" /></div>
        </Modal>
      )}
    </>
  )
}
