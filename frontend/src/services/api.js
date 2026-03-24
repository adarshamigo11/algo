import axios from 'axios'

const TOKEN_KEY = 'at_token'

const api = axios.create({ baseURL: '/api' })

// attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// redirect to login on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem('at_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
export const login = (email, password, role) =>
  api.post('/auth/login', { email, password, role })

// ── Users ─────────────────────────────────────────────────────────────────────
export const getUsers    = ()       => api.get('/admin/users')
export const getUser     = (id)     => api.get(`/admin/users/${id}`)
export const createUser  = (data)   => api.post('/admin/users', data)
export const updateUser  = (id, d)  => api.put(`/admin/users/${id}`, d)
export const deleteUser  = (id)     => api.delete(`/admin/users/${id}`)

// ── SubAdmins ─────────────────────────────────────────────────────────────────
export const getSubAdmins   = ()      => api.get('/admin/subadmins')
export const createSubAdmin = (data)  => api.post('/admin/subadmins', data)
export const updateSubAdmin = (id, d) => api.put(`/admin/subadmins/${id}`, d)
export const deleteSubAdmin = (id)    => api.delete(`/admin/subadmins/${id}`)

// ── Strategies ────────────────────────────────────────────────────────────────
export const getStrategies     = ()       => api.get('/admin/strategies')
export const assignStrategy    = (data)   => api.post('/admin/strategies/assign', data)
export const unassignStrategy  = (data)   => api.delete('/admin/strategies/assign', { data })
export const getUserStrategies = (userId) => api.get(`/admin/strategies/user/${userId}`)

// ── Broker keys ───────────────────────────────────────────────────────────────
export const getBrokers       = (userId) => api.get(`/admin/brokers/${userId}`)
export const saveAngelOne     = (data)   => api.post('/admin/brokers/angelone', data)
export const saveZerodha      = (data)   => api.post('/admin/brokers/zerodha', data)
export const disconnectBroker = (uid, b) => api.delete(`/admin/brokers/${uid}/${b}`)

// ── Audit log ─────────────────────────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/admin/audit', { params })

// ── Instruments ───────────────────────────────────────────────────────────────
export const searchInstruments = (q, exchange) =>
  api.get('/instruments/search', { params: { q, exchange, limit: 20 } })

export default api