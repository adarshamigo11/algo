const express = require('express')
const router  = express.Router()
const Order            = require('../../models/Order')
const StrategyAssignment = require('../../models/StrategyAssignment')
const BrokerAccount    = require('../../models/BrokerAccount')
const { protect, allow } = require('../../middleware/auth')
const brokerFactory    = require('../../brokers/brokerFactory')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/dashboard ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const userId = req.actor._id

    // today's date range
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end   = new Date(); end.setHours(23, 59, 59, 999)

    const [todayOrders, strategies, brokers] = await Promise.all([
      Order.find({ userId, createdAt: { $gte: start, $lte: end } }).sort({ createdAt: -1 }).limit(20),
      StrategyAssignment.find({ userId, isActive: true }).populate('strategyId', 'name description'),
      BrokerAccount.find({ userId }).select('broker isConnected lastRefresh tokenExpiresAt'),
    ])

    // simple P&L: sum of (fillPrice * qty) for sells minus buys today
    let todayPnL = 0
    todayOrders.forEach(o => {
      if (o.status !== 'executed' || !o.fillPrice) return
      const val = o.fillPrice * o.qty
      todayPnL += o.action === 'SELL' ? val : -val
    })

    const algoToday   = todayOrders.filter(o => o.userLabel === 'algo').length
    const manualToday = todayOrders.filter(o => o.userLabel === 'manual').length

    res.json({
      todayPnL:    parseFloat(todayPnL.toFixed(2)),
      todayTrades: todayOrders.length,
      algoToday,
      manualToday,
      recentOrders: todayOrders.slice(0, 8),
      strategies,
      brokers,
    })
  } catch (err) {
    console.error('Dashboard error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET /api/user/positions ──────────────────────────────────────────────────
router.get('/positions', async (req, res) => {
  try {
    const brokers = await BrokerAccount.find({ userId: req.actor._id, isConnected: true })
    const allPositions = []

    for (const b of brokers) {
      try {
        const positions = await brokerFactory.getPositions(req.actor._id, b.broker)
        const list = Array.isArray(positions) ? positions :
          (positions.net || positions.day || [])
        list.forEach(p => allPositions.push({ ...p, broker: b.broker }))
      } catch { /* skip failed broker */ }
    }

    res.json(allPositions)
  } catch (err) {
    console.error('Positions error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET /api/user/holdings ───────────────────────────────────────────────────
router.get('/holdings', async (req, res) => {
  try {
    const brokers = await BrokerAccount.find({ userId: req.actor._id, isConnected: true })
    const allHoldings = []

    for (const b of brokers) {
      try {
        const holdings = await brokerFactory.getHoldings(req.actor._id, b.broker)
        if (Array.isArray(holdings)) {
          holdings.forEach(h => allHoldings.push({ ...h, broker: b.broker }))
        }
      } catch { /* skip */ }
    }

    res.json(allHoldings)
  } catch (err) {
    console.error('Holdings error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
