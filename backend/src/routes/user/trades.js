const express = require('express')
const router  = express.Router()
const Order   = require('../../models/Order')
const { protect, allow } = require('../../middleware/auth')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/trades ─────────────────────────────────────────────────────
// Query: label, symbol, from, to, limit
router.get('/', async (req, res) => {
  try {
    const { label, symbol, from, to, limit = 100 } = req.query

    const filter = { userId: req.actor._id }

    if (label)  filter.userLabel = label
    if (symbol) filter.symbol    = { $regex: symbol, $options: 'i' }
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to)   filter.createdAt.$lte = new Date(to)
    }

    const trades = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .select('symbol exchange action qty price fillPrice orderType productType status userLabel strategyName isPaper placedBy createdAt')

    res.json(trades)
  } catch (err) {
    console.error('Trade history error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
