const ACCENTS = {
  blue:   'linear-gradient(90deg,#534AB7,#378ADD)',
  green:  'linear-gradient(90deg,#1D9E75,#5DCAA5)',
  purple: 'linear-gradient(90deg,#7F77DD,#534AB7)',
  amber:  'linear-gradient(90deg,#BA7517,#EF9F27)',
  red:    'linear-gradient(90deg,#A32D2D,#E24B4A)',
}

const StatCard = ({ label, value, sub, subColor, accent = 'blue' }) => (
  <div className="glass" style={{ padding:'18px 20px', position:'relative', overflow:'hidden' }}>
    <div style={{ position:'absolute', top:0, left:0, right:0, height:2, borderRadius:'12px 12px 0 0', background: ACCENTS[accent] || ACCENTS.blue }} />
    <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:8, letterSpacing:'0.4px', textTransform:'uppercase' }}>{label}</div>
    <div style={{ fontSize:24, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>{value}</div>
    {sub && <div style={{ fontSize:12, color: subColor || 'var(--text-muted)' }}>{sub}</div>}
  </div>
)

export default StatCard
