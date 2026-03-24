import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('at_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('at_token')
      localStorage.removeItem('at_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const getDashboard  = ()      => api.get('/user/dashboard')
export const getPositions  = ()      => api.get('/user/positions')
export const getHoldings   = ()      => api.get('/user/holdings')

// ── Orders ────────────────────────────────────────────────────────────────────
export const placeOrder    = (data)  => api.post('/user/orders', data)
export const getOrderBook  = ()      => api.get('/user/orders')
export const cancelOrder   = (id)    => api.delete(`/user/orders/${id}`)

// ── Trade history ─────────────────────────────────────────────────────────────
export const getTradeHistory = (params) => api.get('/user/trades', { params })

// ── Strategies ────────────────────────────────────────────────────────────────
export const getMyStrategies    = ()          => api.get('/user/strategies')
export const toggleStrategyMode = (id, mode)  => api.put(`/user/strategies/${id}`, { tradingMode: mode })

// ── Brokers ───────────────────────────────────────────────────────────────────
export const getMyBrokers       = ()         => api.get('/user/brokers')
export const connectAngelOne    = (data)     => api.post('/user/brokers/angelone', data)
export const getZerodhaLoginURL = ()         => api.get('/user/brokers/zerodha/login-url')
export const disconnectMyBroker = (broker)   => api.delete(`/user/brokers/${broker}`)

// ── Instruments ───────────────────────────────────────────────────────────────
export const searchInstruments = (q, exchange) =>
  api.get('/instruments/search', { params: { q, exchange, limit: 20 } })

// ── Candles (for charts) ──────────────────────────────────────────────────────
export const getCandles = (token, exchange, interval, from, to) =>
  api.get('/user/candles', { params: { token, exchange, interval, from, to } })

export default api