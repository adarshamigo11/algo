import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { login } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

const ROLES = ['admin', 'subadmin', 'user']

export default function LoginPage() {
  const [role,     setRole]     = useState('admin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)

  const { signIn } = useAuth()
  const toast      = useToast()
  const navigate   = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await login(email, password, role)
      signIn(data.token, data.user)
      // route based on role
      if (data.user.role === 'user') navigate('/dashboard')
      else navigate('/admin')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 20px', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(ellipse 70% 60% at 10% 10%, rgba(83,74,183,0.22) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 90% 90%, rgba(55,138,221,0.16) 0%, transparent 60%), var(--bg-page)',
    }}>
      {/* ambient orbs */}
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(83,74,183,0.12) 0%, transparent 70%)', bottom: -80, left: -80, pointerEvents: 'none' }}/>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 2 }}>
        {/* card */}
        <div className="glass" style={{ padding: '40px 36px', boxShadow: '0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.07)' }}>

          {/* logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 28 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: '#fff' }}>AT</div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, color: '#fff' }}>AlgoTrade</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>Trading Platform</div>
            </div>
          </div>

          {/* market open badge */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(29,158,117,0.12)', border: '1px solid rgba(29,158,117,0.22)', borderRadius: 20, padding: '3px 10px', fontSize: 11, color: 'var(--green)', marginBottom: 20 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }}/>
            SEBI Authorised Platform
          </div>

          <div style={{ fontSize: 20, fontWeight: 600, color: '#fff', marginBottom: 4 }}>Welcome back</div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Sign in to continue to your account</div>

          {/* role tabs */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3, gap: 3, marginBottom: 22 }}>
            {ROLES.map(r => (
              <button key={r} onClick={() => setRole(r)} style={{
                flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 500,
                textAlign: 'center', borderRadius: 8, cursor: 'pointer',
                border: 'none', fontFamily: 'var(--font)',
                background: role === r ? 'var(--accent-grad)' : 'transparent',
                color: role === r ? '#fff' : 'var(--text-muted)',
                boxShadow: role === r ? '0 2px 8px rgba(83,74,183,0.4)' : 'none',
                transition: 'all 0.2s', textTransform: 'capitalize',
              }}>
                {r === 'subadmin' ? 'Sub-admin' : r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Email address</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div className="field" style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input className="input" type="password" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            <div style={{ textAlign: 'right', marginBottom: 20 }}>
              <span style={{ fontSize: 12, color: 'rgba(127,119,221,0.8)', cursor: 'pointer' }}>Forgot password?</span>
            </div>
            <button className="btn btn-primary w-full" style={{ justifyContent: 'center', padding: '11px' }} disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in to dashboard'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 11, color: 'var(--text-muted)' }}>
            Secured with AES-256 encryption
          </div>
        </div>
      </div>
    </div>
  )
}
