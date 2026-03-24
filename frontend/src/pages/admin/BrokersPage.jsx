import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import Modal  from '../../components/common/Modal'
import { getUsers, getBrokers, saveAngelOne, saveZerodha, disconnectBroker } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function BrokersPage() {
  const [users,    setUsers]    = useState([])
  const [selected, setSelected] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [modal,    setModal]    = useState(null) // 'angelone' | 'zerodha'
  const [form,     setForm]     = useState({})
  const toast = useToast()

  useEffect(() => {
    getUsers().then(r => setUsers(r.data)).catch(() => toast.error('Failed to load users'))
  }, [])

  const selectUser = async (u) => {
    setSelected(u)
    try {
      const { data } = await getBrokers(u._id)
      setAccounts(data)
    } catch { toast.error('Failed to load broker accounts') }
  }

  const openModal = (broker) => {
    setForm({})
    setModal(broker)
  }

  const handleSave = async () => {
    try {
      const payload = { userId: selected._id, ...form }
      if (modal === 'angelone') await saveAngelOne(payload)
      if (modal === 'zerodha')  await saveZerodha(payload)
      toast.success('Credentials saved')
      setModal(null)
      const { data } = await getBrokers(selected._id)
      setAccounts(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDisconnect = async (broker) => {
    if (!window.confirm(`Disconnect ${broker} for ${selected.name}?`)) return
    try {
      await disconnectBroker(selected._id, broker)
      toast.success('Disconnected')
      const { data } = await getBrokers(selected._id)
      setAccounts(data)
    } catch { toast.error('Disconnect failed') }
  }

  const getAccount = (broker) => accounts.find(a => a.broker === broker)

  return (
    <>
      <Topbar title="Broker keys" subtitle="Manage API credentials per user" />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>

          {/* user list */}
          <div className="glass p-16">
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Users</div>
            {users.map(u => (
              <div key={u._id} onClick={() => selectUser(u)} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                background: selected?._id === u._id ? 'rgba(83,74,183,0.18)' : 'transparent',
                border: `1px solid ${selected?._id === u._id ? 'rgba(83,74,183,0.3)' : 'transparent'}`,
              }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                  {u.name[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{u.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{u.email}</div>
                </div>
              </div>
            ))}
          </div>

          {/* broker cards */}
          <div>
            {!selected ? (
              <div className="glass p-20" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a user to manage their broker connections
              </div>
            ) : (
              <>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 14 }}>
                  {selected.name} — broker connections
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <BrokerCard
                    name="Angel One" broker="angelone" color="#FF8C00"
                    account={getAccount('angelone')}
                    onConnect={() => openModal('angelone')}
                    onDisconnect={() => handleDisconnect('angelone')}
                  />
                  <BrokerCard
                    name="Zerodha" broker="zerodha" color="#387ED1"
                    account={getAccount('zerodha')}
                    onConnect={() => openModal('zerodha')}
                    onDisconnect={() => handleDisconnect('zerodha')}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Angel One modal */}
      {modal === 'angelone' && (
        <Modal title="Save Angel One credentials" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            All credentials are encrypted with AES-256 before saving to the database.
          </div>
          <div className="field"><label>Client ID</label>
            <input className="input" value={form.clientId||''} onChange={e => setForm({...form,clientId:e.target.value})} placeholder="A12345678" /></div>
          <div className="field"><label>API Key</label>
            <input className="input" value={form.apiKey||''} onChange={e => setForm({...form,apiKey:e.target.value})} /></div>
          <div className="field"><label>MPIN</label>
            <input className="input" type="password" value={form.pin||''} onChange={e => setForm({...form,pin:e.target.value})} /></div>
          <div className="field"><label>TOTP Secret</label>
            <input className="input" value={form.totpSecret||''} onChange={e => setForm({...form,totpSecret:e.target.value})} placeholder="Base32 secret from authenticator app" /></div>
        </Modal>
      )}

      {/* Zerodha modal */}
      {modal === 'zerodha' && (
        <Modal title="Save Zerodha credentials" onClose={() => setModal(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button><button className="btn btn-primary" onClick={handleSave}>Save</button></>}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
            After saving, the user must complete OAuth by visiting the Zerodha login link.
          </div>
          <div className="field"><label>API Key</label>
            <input className="input" value={form.apiKey||''} onChange={e => setForm({...form,apiKey:e.target.value})} /></div>
          <div className="field"><label>API Secret</label>
            <input className="input" type="password" value={form.apiSecret||''} onChange={e => setForm({...form,apiSecret:e.target.value})} /></div>
        </Modal>
      )}
    </>
  )
}

function BrokerCard({ name, broker, color, account, onConnect, onDisconnect }) {
  const connected = account?.isConnected
  const initial   = name.slice(0,2).toUpperCase()

  return (
    <div className="glass p-16" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${color}22`, border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
        {initial}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>{name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
          {connected
            ? `Connected · last refreshed ${account.lastRefresh ? new Date(account.lastRefresh).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—'}`
            : 'Not connected'}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {connected
          ? <button className="btn btn-danger btn-sm" onClick={onDisconnect}>Disconnect</button>
          : <button className="btn btn-ghost btn-sm" onClick={onConnect}>Connect</button>
        }
      </div>
      <span className={`badge ${connected ? 'badge-green' : 'badge-gray'}`}>
        {connected ? 'connected' : 'not connected'}
      </span>
    </div>
  )
}
