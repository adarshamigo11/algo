import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import { getUsers, getStrategies, getUserStrategies, assignStrategy, unassignStrategy } from '../../services/api'
import { useToast } from '../../context/ToastContext'

export default function StrategiesPage() {
  const [users,       setUsers]       = useState([])
  const [strategies,  setStrategies]  = useState([])
  const [selected,    setSelected]    = useState(null) // selected user
  const [assignments, setAssignments] = useState([])
  const toast = useToast()

  useEffect(() => {
    Promise.all([getUsers(), getStrategies()])
      .then(([u, s]) => { setUsers(u.data); setStrategies(s.data) })
      .catch(() => toast.error('Failed to load'))
  }, [])

  const selectUser = async (user) => {
    setSelected(user)
    try {
      const { data } = await getUserStrategies(user._id)
      setAssignments(data)
    } catch { toast.error('Failed to load assignments') }
  }

  const isAssigned = (stratId) =>
    assignments.some(a => a.strategyId?._id === stratId || a.strategyId === stratId)

  const toggle = async (strat) => {
    if (!selected) return
    try {
      if (isAssigned(strat._id)) {
        await unassignStrategy({ userId: selected._id, strategyId: strat._id })
        toast.info(`${strat.name} removed`)
      } else {
        await assignStrategy({ userId: selected._id, strategyId: strat._id })
        toast.success(`${strat.name} assigned`)
      }
      const { data } = await getUserStrategies(selected._id)
      setAssignments(data)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed')
    }
  }

  return (
    <>
      <Topbar title="Strategy assignment" subtitle="Assign strategies to users based on their plan" />
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

          {/* user list */}
          <div className="glass p-16">
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>Select user</div>
            {users.map(u => (
              <div key={u._id} onClick={() => selectUser(u)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3,
                background: selected?._id === u._id ? 'rgba(83,74,183,0.18)' : 'transparent',
                border: `1px solid ${selected?._id === u._id ? 'rgba(83,74,183,0.3)' : 'transparent'}`,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-grad)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, color: '#fff', flexShrink: 0 }}>
                  {u.name.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 500, color: '#fff' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.plan} plan</div>
                </div>
              </div>
            ))}
          </div>

          {/* strategy cards */}
          <div>
            {!selected ? (
              <div className="glass p-20" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                Select a user on the left to manage their strategies
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{selected.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {assignments.length} of {strategies.length} strategies assigned
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {strategies.map(s => {
                    const assigned = isAssigned(s._id)
                    return (
                      <div key={s._id} onClick={() => toggle(s)} style={{
                        padding: 16, borderRadius: 12, cursor: 'pointer',
                        background: assigned ? 'rgba(83,74,183,0.14)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${assigned ? 'rgba(83,74,183,0.35)' : 'var(--border)'}`,
                        transition: 'all 0.15s',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: assigned ? 'var(--green)' : 'rgba(255,255,255,0.15)' }}/>
                          <span className={`badge ${assigned ? 'badge-algo' : 'badge-gray'}`}>
                            {assigned ? 'assigned' : 'not assigned'}
                          </span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: assigned ? '#AFA9EC' : 'rgba(255,255,255,0.7)', marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.description?.slice(0, 60)}…</div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
