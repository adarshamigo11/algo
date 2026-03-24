import { useEffect, useState } from 'react'
import Topbar from '../../components/common/Topbar'
import Modal  from '../../components/common/Modal'
import { getSubAdmins, createSubAdmin, updateSubAdmin, deleteSubAdmin } from '../../services/api'
import { useToast } from '../../context/ToastContext'

const PERMS = [
  { key: 'manageUsers',      label: 'Manage assigned users' },
  { key: 'placeTrades',      label: 'Place trades (Algo)' },
  { key: 'viewPnL',          label: 'View user P&L' },
  { key: 'assignStrategies', label: 'Assign strategies' },
  { key: 'toggleAutomation', label: 'Enable/disable automation' },
  { key: 'viewTradeHistory', label: 'View trade history' },
  { key: 'manageBrokerKeys', label: 'Manage broker keys' },
  { key: 'viewAuditLogs',    label: 'View audit logs' },
]

const EMPTY_FORM = { name: '', email: '', phone: '', password: '', permissions: {} }

export default function SubAdminsPage() {
  const [list,    setList]    = useState([])
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const [form,    setForm]    = useState(EMPTY_FORM)
  const [editing, setEditing] = useState(null)
  const toast = useToast()

  const load = async () => {
    try {
      const { data } = await getSubAdmins()
      setList(data)
    } catch { toast.error('Failed to load sub-admins') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => { setForm(EMPTY_FORM); setEditing(null); setModal('form') }
  const openEdit   = (s) => {
    setForm({ name: s.name, email: s.email, phone: s.phone || '', password: '', permissions: { ...s.permissions } })
    setEditing(s); setModal('form')
  }

  const togglePerm = (key) => {
    setForm(f => ({ ...f, permissions: { ...f.permissions, [key]: !f.permissions[key] } }))
  }

  const handleSave = async () => {
    try {
      if (!editing) {
        await createSubAdmin(form)
        toast.success('Sub-admin created')
      } else {
        await updateSubAdmin(editing._id, form)
        toast.success('Sub-admin updated')
      }
      setModal(null); load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this sub-admin?')) return
    try {
      await deleteSubAdmin(id); toast.success('Deleted'); load()
    } catch { toast.error('Delete failed') }
  }

  const permCount = (s) => Object.values(s.permissions || {}).filter(Boolean).length

  return (
    <>
      <Topbar title="Sub-admins" subtitle="Admin only" />
      <div className="page-body">
        <div className="flex items-center justify-between mb-16">
          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{list.length} sub-admins</div>
          <button className="btn btn-primary" onClick={openCreate}>+ New sub-admin</button>
        </div>

        <div className="glass">
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Name</th><th>Email</th><th>Permissions</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</td></tr>
                ) : list.map(s => (
                  <tr key={s._id}>
                    <td className="td-primary">{s.name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{s.email}</td>
                    <td>
                      <span className="badge badge-gray">{permCount(s)} / 8 permissions</span>
                    </td>
                    <td>
                      <span className={`badge ${s.isActive ? 'badge-green' : 'badge-red'}`}>
                        {s.isActive ? 'active' : 'suspended'}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-8">
                        <button className="btn btn-ghost btn-sm" onClick={() => openEdit(s)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(s._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modal === 'form' && (
        <Modal
          title={editing ? 'Edit sub-admin' : 'Create sub-admin'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave}>{editing ? 'Save' : 'Create'}</button>
            </>
          }
        >
          <div className="field"><label>Full name</label>
            <input className="input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
          <div className="field"><label>Email</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
          <div className="field"><label>Phone</label>
            <input className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
          <div className="field"><label>Password {editing && '(leave blank to keep current)'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} /></div>

          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>Permissions</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {PERMS.map(p => (
                <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, background: form.permissions[p.key] ? 'rgba(83,74,183,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${form.permissions[p.key] ? 'rgba(83,74,183,0.3)' : 'var(--border)'}` }}>
                  <input type="checkbox" checked={!!form.permissions[p.key]} onChange={() => togglePerm(p.key)} style={{ accentColor: 'var(--accent-purple)', width: 14, height: 14 }} />
                  <span style={{ fontSize: 12, color: form.permissions[p.key] ? '#AFA9EC' : 'var(--text-muted)' }}>{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
