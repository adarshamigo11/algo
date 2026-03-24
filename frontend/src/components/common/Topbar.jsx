import { useSocket } from '../../hooks/useSocket'

export default function Topbar({ title, subtitle }) {
  const { prices, connected } = useSocket()

  const nifty   = prices['NIFTY']   || prices['Nifty 50']
  const bnifty  = prices['BANKNIFTY']|| prices['Nifty Bank']

  return (
    <header style={{
      height: 'var(--topbar-h)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(255,255,255,0.02)',
      flexShrink: 0,
    }}>
      <div>
        <div style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{subtitle}</div>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* market pills */}
        {nifty && <MarketPill label="NIFTY" ltp={nifty.ltp} />}
        {bnifty && <MarketPill label="BNKFTY" ltp={bnifty.ltp} />}

        {/* ws status */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '4px 10px', borderRadius: 20,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid var(--border)',
          fontSize: 11,
          color: connected ? 'var(--green)' : 'var(--text-muted)',
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: connected ? 'var(--green)' : 'rgba(255,255,255,0.2)',
            flexShrink: 0,
          }}/>
          {connected ? 'Live' : 'Connecting'}
        </div>
      </div>
    </header>
  )
}

function MarketPill({ label, ltp }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '4px 10px', borderRadius: 20,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid var(--border)',
      fontSize: 11, color: 'rgba(255,255,255,0.6)',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--green)' }}/>
      {label} {ltp?.toLocaleString('en-IN')}
    </div>
  )
}
