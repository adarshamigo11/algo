const express      = require('express')
const router       = express.Router()
const Order        = require('../../models/Order')
const User         = require('../../models/User')
const { protect, allow, hasPermission } = require('../../middleware/auth')
const orderExecutor = require('../../automation/orderExecutor')
const { log }      = require('../../utils/auditLog')

router.use(protect)
router.use(allow('admin', 'subadmin'))

// ─── GET /api/admin/orders — all orders (filterable) ─────────────────────────
router.get('/', async (req, res) => {
  try {
    const { userId, label, status, limit = 100 } = req.query
    const filter = {}
    if (userId) filter.userId    = userId
    if (label)  filter.userLabel = label
    if (status) filter.status    = status

    // subadmin: only see orders for their assigned users
    if (req.actor.role === 'subadmin') {
      const assignedUsers = await User.find({ assignedTo: req.actor._id }).select('_id')
      filter.userId = { $in: assignedUsers.map(u => u._id) }
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.json(orders)
  } catch (err) {
    console.error('Get orders error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/orders — place trade on behalf of a user ─────────────────
router.post('/', hasPermission('placeTrades'), async (req, res) => {
  const { userId, symbol, exchange, action, qty,
          price, orderType, productType, token } = req.body

  if (!userId || !symbol || !action || !qty) {
    return res.status(400).json({ message: 'userId, symbol, action, qty are required' })
  }

  try {
    const user = await User.findById(userId)
    if (!user)           return res.status(404).json({ message: 'User not found' })
    if (!user.isActive)  return res.status(400).json({ message: 'User account is suspended' })

    const result = await orderExecutor.execute({
      userId,
      symbol:      String(symbol).toUpperCase(),
      exchange:    exchange || 'NSE',
      action:      String(action).toUpperCase(),
      qty:         parseInt(qty),
      price:       parseFloat(price) || 0,
      orderType:   orderType  || 'MARKET',
      productType: productType|| 'MIS',
      token:       token || null,
      placedBy:    req.actor.role,   // 'admin' or 'subadmin'
      userLabel:   'algo',           // always ALGO for admin/subadmin trades
      strategyName:'Admin Trade',
      isPaper:     user.tradingMode === 'paper',
    })

    await log({
      actorId:      req.actor._id,
      actorRole:    req.actor.role,
      actorName:    req.actor.name,
      action:       'order_placed',
      targetUserId: userId,
      meta: { symbol, action, qty, exchange, result },
    })

    res.json({ message: 'Order placed', ...result })

  } catch (err) {
    console.error('Place order error:', err.message)
    res.status(400).json({ message: err.message })
  }
})

module.exports = router
