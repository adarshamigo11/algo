const express = require('express')
const router  = express.Router()
const Order        = require('../../models/Order')
const User         = require('../../models/User')
const { protect, allow } = require('../../middleware/auth')
const orderExecutor = require('../../automation/orderExecutor')
const { log }      = require('../../utils/auditLog')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/orders ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.actor._id })
      .sort({ createdAt: -1 })
      .limit(50)
    res.json(orders)
  } catch (err) {
    console.error('Get orders error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/user/orders — user places their own manual order ───────────────
router.post('/', async (req, res) => {
  const { symbol, exchange, action, qty, price, orderType, productType, token } = req.body

  if (!symbol || !action || !qty) {
    return res.status(400).json({ message: 'symbol, action, qty are required' })
  }

  try {
    const user = await User.findById(req.actor._id)

    const result = await orderExecutor.execute({
      userId:      req.actor._id,
      symbol:      String(symbol).toUpperCase(),
      exchange:    exchange || 'NSE',
      action:      String(action).toUpperCase(),
      qty:         parseInt(qty),
      price:       parseFloat(price) || 0,
      orderType:   orderType   || 'MARKET',
      productType: productType || 'MIS',
      token:       token || null,
      placedBy:    'user',
      userLabel:   'manual',
      strategyName: null,
      isPaper:     user.tradingMode === 'paper',
    })

    await log({
      actorId:      req.actor._id,
      actorRole:    'user',
      actorName:    req.actor.name,
      action:       'order_placed',
      targetUserId: req.actor._id,
      meta:         { symbol, action, qty, exchange },
    })

    res.json({ message: 'Order placed', ...result })
  } catch (err) {
    console.error('Place order error:', err.message)
    res.status(400).json({ message: err.message })
  }
})

// ─── DELETE /api/user/orders/:id ─────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, userId: req.actor._id })
    if (!order) return res.status(404).json({ message: 'Order not found' })
    if (order.status !== 'pending' && order.status !== 'open') {
      return res.status(400).json({ message: 'Only pending/open orders can be cancelled' })
    }
    order.status = 'cancelled'
    await order.save()
    res.json({ message: 'Order cancelled' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
