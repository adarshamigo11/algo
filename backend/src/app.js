require('dotenv').config()
const http    = require('http')
const express = require('express')
const cors    = require('cors')
const connectDB     = require('./config/db')
const loadSettings  = require('./config/loadSettings')

// ── Admin routes ──────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth')
const userRoutes       = require('./routes/admin/users')
const subAdminRoutes   = require('./routes/admin/subadmins')
const strategyRoutes   = require('./routes/admin/strategies')
const brokerRoutes     = require('./routes/admin/brokers')
const auditRoutes      = require('./routes/admin/audit')
const orderRoutes      = require('./routes/admin/orders')
const settingsRoutes   = require('./routes/admin/settings')
const instrumentRoutes = require('./routes/instruments')
const webhookRoutes    = require('./routes/webhook')

// ── User routes ───────────────────────────────────────────────────────────────
const userDashboardRoutes = require('./routes/user/dashboard')
const userOrderRoutes     = require('./routes/user/orders')
const userTradeRoutes     = require('./routes/user/trades')
const userStrategyRoutes  = require('./routes/user/strategies')
const userBrokerRoutes    = require('./routes/user/brokers')
const userCandleRoutes    = require('./routes/user/candles')

// ── Services ──────────────────────────────────────────────────────────────────
const socketManager  = require('./socket/socketManager')
const marketData     = require('./marketdata/marketData')
const strategyRunner = require('./automation/strategyRunner')
const orderExecutor  = require('./automation/orderExecutor')

// ── Crons ─────────────────────────────────────────────────────────────────────
const { startTokenRefreshCron }       = require('./cron/tokenRefresh')
const { startInstrumentDownloadCron } = require('./cron/instrumentDownload')
const { startSquareOffCron }          = require('./cron/squareOff')

const app    = express()
const server = http.createServer(app)

app.use(cors())
app.use(express.json())

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',              authRoutes)
app.use('/api/admin/users',       userRoutes)
app.use('/api/admin/subadmins',   subAdminRoutes)
app.use('/api/admin/strategies',  strategyRoutes)
app.use('/api/admin/brokers',     brokerRoutes)
app.use('/api/admin/audit',       auditRoutes)
app.use('/api/admin/orders',      orderRoutes)
app.use('/api/admin/settings',    settingsRoutes)
app.use('/api/instruments',       instrumentRoutes)
app.use('/api/webhook',           webhookRoutes)

app.use('/api/user/dashboard',    userDashboardRoutes)
app.use('/api/user/orders',       userOrderRoutes)
app.use('/api/user/trades',       userTradeRoutes)
app.use('/api/user/strategies',   userStrategyRoutes)
app.use('/api/user/brokers',      userBrokerRoutes)
app.use('/api/user/candles',      userCandleRoutes)
app.use('/api/user',              userDashboardRoutes)

app.use((req, res) => res.status(404).json({ message: 'Route not found' }))
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message)
  res.status(500).json({ message: 'Internal server error' })
})

const PORT = process.env.PORT || 5000

const start = async () => {
  await connectDB()

  // load admin Angel One credentials saved via settings panel
  await loadSettings()

  socketManager.init(server)

  server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`)

    marketData.onTick(tick => socketManager.emitTick(tick))
    await strategyRunner.init(orderExecutor)

    try {
      await marketData.connect()
    } catch (err) {
      console.warn('[MarketData] Could not connect on startup:', err.message)
      console.warn('[MarketData] Set Angel One credentials in Admin → Platform Settings')
    }

    startTokenRefreshCron()
    startInstrumentDownloadCron()
    startSquareOffCron()
  })
}

start()