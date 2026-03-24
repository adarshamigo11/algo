import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { useToast } from '../../context/ToastContext'
import api from '../../services/api'

export default function SettingsPage() {
  const [status,   setStatus]   = useState(null)   // existing config status
  const [form,     setForm]     = useState({ clientId: '', apiKey: '', totpSecret: '', pin: '' })
  const [saving,   setSaving]   = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [testMsg,  setTestMsg]  = useState(null)
  const [showKeys, setShowKeys] = useState(false)
  const toast = useToast()

  useEffect(() => {
    api.get('/admin/settings')
      .then(r => setStatus(r.data))
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    const { clientId, apiKey, totpSecret, pin } = form
    if (!clientId || !apiKey || !totpSecret || !pin) {
      toast.error('All four fields are required')
      return
    }
    setSaving(true)
    try {
      await api.post('/admin/settings', { clientId, apiKey, totpSecret, pin })
      toast.success('Credentials saved successfully')
      setForm({ clientId: '', apiKey: '', totpSecret: '', pin: '' })
      // refresh status
      const r = await api.get('/admin/settings')
      setStatus(r.data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestMsg(null)
    try {
      const { data } = await api.post('/admin/settings/test')
      setTestMsg({ ok: true, text: data.message })
      toast.success('Angel One connected successfully')
    } catch (err) {
      const msg = err.response?.data?.message || 'Connection failed'
      setTestMsg({ ok: false, text: msg })
      toast.error(msg)
    } finally {
      setTesting(false)
    }
  }

  const isConfigured = status?.ANGELONE_CLIENT_ID_set

  return (
    <>
      <Topbar title="Platform settings" subtitle="Admin only" />
      <div className="page-body">
        <div style={{ maxWidth: 600 }}>

          {/* status card */}
          <div className="glass p-16" style={{
            marginBottom: 20,
            borderLeft: `3px solid ${isConfigured ? 'var(--green)' : 'var(--amber)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: isConfigured ? 'var(--green)' : 'var(--amber)',
                flexShrink: 0,
              }}/>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                  Angel One market data account
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {isConfigured
                    ? 'Credentials are saved. This account powers live charts for all users.'
                    : 'Not configured yet. Set credentials below to enable live market data.'}
                </div>
              </div>
            </div>

            {/* show masked current values */}
            {isConfigured && status && (
              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Client ID',    val: status.ANGELONE_CLIENT_ID },
                  { label: 'API Key',      val: status.ANGELONE_API_KEY },
                  { label: 'TOTP Secret',  val: status.ANGELONE_TOTP_SECRET },
                  { label: 'MPIN',         val: status.ANGELONE_PIN },
                ].map(item => (
                  <div key={item.label} style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontSize: 12, fontFamily: 'monospace', color: 'var(--green)' }}>
                      {showKeys ? item.val : item.val}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* test connection button */}
            {isConfigured && (
              <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button className="btn btn-ghost btn-sm" onClick={handleTest} disabled={testing}>
                  {testing ? 'Testing…' : 'Test connection'}
                </button>
                {testMsg && (
                  <span style={{ fontSize: 12, color: testMsg.ok ? 'var(--green)' : 'var(--red)' }}>
                    {testMsg.text}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* credentials form */}
          <div className="glass p-20">
            <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 4 }}>
              {isConfigured ? 'Update credentials' : 'Set Angel One credentials'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
              These credentials are used to power live market data (charts and prices) for all users on the platform.
              They are stored encrypted in the database and never exposed in plain text.
            </div>

            <div className="field">
              <label>Client ID</label>
              <input className="input" value={form.clientId}
                onChange={e => setForm({ ...form, clientId: e.target.value })}
                placeholder="e.g. A12345678" />
            </div>

            <div className="field">
              <label>API Key</label>
              <input className="input" value={form.apiKey}
                onChange={e => setForm({ ...form, apiKey: e.target.value })}
                placeholder="Your Angel One API key" />
            </div>

            <div className="field">
              <label>TOTP Secret</label>
              <input className="input" value={form.totpSecret}
                onChange={e => setForm({ ...form, totpSecret: e.target.value })}
                placeholder="Base32 secret from authenticator app" />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                Found in Angel One → My Profile → Enable TOTP → View Secret Key
              </div>
            </div>

            <div className="field">
              <label>MPIN</label>
              <input className="input" type="password" value={form.pin}
                onChange={e => setForm({ ...form, pin: e.target.value })}
                placeholder="Your 4-digit Angel One MPIN" />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}
                style={{ flex: 1, justifyContent: 'center' }}>
                {saving ? 'Saving…' : isConfigured ? 'Update credentials' : 'Save credentials'}
              </button>
            </div>
          </div>

          {/* info box */}
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'rgba(83,74,183,0.08)', border: '1px solid rgba(83,74,183,0.18)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#AFA9EC', marginBottom: 8 }}>How this works</div>
            {[
              'Your Angel One account connects once at 8 AM daily via an automated login',
              'The feedToken obtained is used to subscribe to live market data via WebSocket',
              'All users on the platform see live charts powered by this single connection',
              'This is a market data only account — user trades go through their own connected accounts',
              'Credentials are encrypted with AES-256 before being stored in the database',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4, fontSize: 12, color: 'var(--text-muted)' }}>
                <span style={{ color: '#AFA9EC', flexShrink: 0 }}>→</span>{t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}