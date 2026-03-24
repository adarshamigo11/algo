import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import Modal  from '../../components/common/Modal'
import { getUsers, createUser, updateUser, deleteUser } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const EMPTY = { name: '', email: '', phone: '', password: '', plan: 'basic' }

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [search,  setSearch]  = useState('')
  const [error,   setError]   = useState('')
  const toast = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const { data } = await getUsers()
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(EMPTY)
    setEditing(null)
    setError('')
    setModal('create')
  }

  const openEdit = (u) => {
    setForm({
      name:              u.name,
      email:             u.email,
      phone:             u.phone || '',
      plan:              u.plan,
      automationEnabled: u.automationEnabled,
      tradingMode:       u.tradingMode,
    })
    setEditing(u)
    setError('')
    setModal('edit')
  }

  const handleSave = async () => {
    setError('')

    // client-side validation
    if (!form.name.trim()) { setError('Full name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    if (modal === 'create' && !form.password) { setError('Password is required'); return }
    if (modal === 'create' && form.password.length < 6) { setError('Password must be at least 6 characters'); return }

    setSaving(true)
    try {
      if (modal === 'create') {
        await createUser({
          name:     form.name.trim(),
          email:    form.email.trim().toLowerCase(),
          phone:    form.phone.trim(),
          password: form.password,
          plan:     form.plan,
        })
        toast.success('User created successfully')
      } else {
        await updateUser(editing._id, form)
        toast.success('User updated')
      }
      setModal(null)
      load()
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong'
      setError(msg)
      console.error('Create user error:', err.response?.data || err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      await deleteUser(id)
      toast.success('User deleted')
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Delete failed')
    }
  }

  const handleToggle = async (u, field) => {
    try {
      await updateUser(u._id, { [field]: !u[field] })
      load()
    } catch {
      toast.error('Update failed')
    }
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      <Topbar title="Users" subtitle={`${users.length} total`} />
      <div className="page-body">

        {/* toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <input
            className="input"
            style={{ width: 240 }}
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openCreate}>
            + New user
          </button>
        </div>

        {/* table */}
        <div className="glass">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Plan</th>
                  <th>Mode</th>
                  <th>Automation</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Loading…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>
                    No users yet. Click <strong style={{ color: '#AFA9EC' }}>+ New user</strong> above to create one.
                  </td></tr>
                ) : filtered.map(u => (
                  <tr key={u._id}>
                    <td className="td-primary">{u.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td><span className="badge badge-gray" style={{ textTransform: 'capitalize' }}>{u.plan}</span></td>
                    <td><span className={`badge ${u.tradingMode === 'live' ? 'badge-green' : 'badge-amber'}`}>{u.tradingMode}</span></td>
                    <td><Toggle on={u.automationEnabled} onChange={() => handleToggle(u, 'automationEnabled')} /></td>
                    <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'active' : 'suspended'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(u)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* modal */}
      {(modal === 'create' || modal === 'edit') && (
        <Modal
          title={modal === 'create' ? 'Create new user' : 'Edit user'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)} disabled={saving}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : modal === 'create' ? 'Create user' : 'Save changes'}
              </button>
            </>
          }
        >
          {/* error banner inside modal */}
          {error && (
            <div style={{
              marginBottom: 14, padding: '10px 14px',
              background: 'rgba(226,75,74,0.12)',
              border: '1px solid rgba(226,75,74,0.3)',
              borderRadius: 8, fontSize: 13,
              color: 'var(--red)',
            }}>
              {error}
            </div>
          )}

          <div className="field">
            <label>Full name</label>
            <input className="input" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Rahul Kumar" />
          </div>
          <div className="field">
            <label>Email address</label>
            <input className="input" type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="rahul@example.com" />
          </div>
          <div className="field">
            <label>Phone (optional)</label>
            <input className="input" value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              placeholder="9876543210" />
          </div>
          {modal === 'create' && (
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Min 6 characters" />
            </div>
          )}
          <div className="field">
            <label>Plan</label>
            <select className="input" value={form.plan}
              onChange={e => setForm({ ...form, plan: e.target.value })}>
              <option value="basic">Basic</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          {modal === 'edit' && (
            <div className="field">
              <label>Trading mode</label>
              <select className="input" value={form.tradingMode}
                onChange={e => setForm({ ...form, tradingMode: e.target.value })}>
                <option value="paper">Paper (simulation)</option>
                <option value="live">Live (real money)</option>
              </select>
            </div>
          )}
        </Modal>
      )}
    </>
  )
}

function Toggle({ on, onChange }) {
  return (
    <div onClick={onChange} style={{
      width: 36, height: 20, borderRadius: 10, cursor: 'pointer',
      background: on ? '#534AB7' : 'rgba(255,255,255,0.12)',
      position: 'relative', transition: 'background 0.2s',
    }}>
      <div style={{
        position: 'absolute', top: 2, left: on ? 18 : 2,
        width: 16, height: 16, borderRadius: '50%',
        background: '#fff', transition: 'left 0.2s',
      }} />
    </div>
  )
}