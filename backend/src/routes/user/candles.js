const express  = require('express')
const router   = express.Router()
const { protect, allow } = require('../../middleware/auth')
const angelone = require('../../brokers/angelone')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/candles ────────────────────────────────────────────────────
// Query: token, exchange, interval (ONE_MINUTE|FIVE_MINUTE|FIFTEEN_MINUTE|ONE_DAY), from, to
router.get('/', async (req, res) => {
  const { token, exchange, interval, from, to } = req.query

  if (!token || !interval) {
    return res.status(400).json({ message: 'token and interval are required' })
  }

  try {
    // use admin's token for market data — not the user's token
    const adminToken  = process.env._ADMIN_JWT_TOKEN
    const adminApiKey = process.env.ANGELONE_API_KEY

    if (!adminToken) {
      return res.status(503).json({ message: 'Market data not available — admin token not refreshed yet' })
    }

    // default: last 100 candles
    const toDate   = to   || new Date().toISOString().replace('T', ' ').slice(0, 19)
    const fromDate = from || (() => {
      const d = new Date()
      const intervalMins = { ONE_MINUTE: 100, FIVE_MINUTE: 500, FIFTEEN_MINUTE: 1500, ONE_DAY: 100 }[interval] || 100
      d.setMinutes(d.getMinutes() - intervalMins)
      return d.toISOString().replace('T', ' ').slice(0, 19)
    })()

    const candles = await angelone.getCandles({
      accessToken: adminToken,
      apiKey:      adminApiKey,
      exchange:    exchange || 'NSE',
      symboltoken: token,
      interval,
      fromdate:    fromDate,
      todate:      toDate,
    })

    // Angel One returns [[timestamp, open, high, low, close, volume], ...]
    const formatted = Array.isArray(candles) ? candles.map(c => ({
      time:   new Date(c[0]).getTime() / 1000,
      open:   c[1], high: c[2], low: c[3], close: c[4], volume: c[5],
    })) : []

    res.json(formatted)
  } catch (err) {
    console.error('Candles error:', err.message)
    res.status(500).json({ message: 'Failed to fetch candles' })
  }
})

module.exports = router
