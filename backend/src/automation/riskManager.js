// Runs 5 risk gates before any order is placed.
// Returns { passed: true } or { passed: false, reason: '...' }

const Order = require('../models/Order')

const check = async (user, order) => {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))

  // Gate 1 — Market hours
  const mins = ist.getHours() * 60 + ist.getMinutes()
  const day  = ist.getDay()
  if (day === 0 || day === 6) {
    return { passed: false, reason: 'Market closed — weekend' }
  }
  if (mins < 555 || mins > 915) {
    return { passed: false, reason: 'Market closed — outside trading hours (9:15 AM – 3:15 PM)' }
  }

  // Gate 2 — Max position size
  const maxQty = user.riskParams?.maxPositionSize || 1
  if (order.qty > maxQty) {
    return { passed: false, reason: `Qty ${order.qty} exceeds max position size ${maxQty}` }
  }

  // Gate 3 — Daily loss limit
  const startOfDay = new Date(ist)
  startOfDay.setHours(0, 0, 0, 0)

  const todayOrders = await Order.find({
    userId:    user._id,
    status:    'executed',
    createdAt: { $gte: startOfDay },
    isPaper:   false,
  })

  const todayLoss = todayOrders.reduce((sum, o) => {
    if (o.action === 'BUY'  && o.fillPrice && o.fillPrice < o.price) return sum + (o.price - o.fillPrice) * o.qty
    if (o.action === 'SELL' && o.fillPrice && o.fillPrice > o.price) return sum + (o.fillPrice - o.price) * o.qty
    return sum
  }, 0)

  const dailyLossLimit = user.riskParams?.dailyLossLimit || 5000
  if (todayLoss >= dailyLossLimit) {
    return { passed: false, reason: `Daily loss limit ₹${dailyLossLimit} reached` }
  }

  // Gate 4 — Duplicate order (same symbol + side within 60 seconds)
  const sixtySecondsAgo = new Date(Date.now() - 60000)
  const duplicate = await Order.findOne({
    userId:    user._id,
    symbol:    order.symbol,
    action:    order.action,
    createdAt: { $gte: sixtySecondsAgo },
    status:    { $in: ['pending', 'open', 'executed'] },
  })
  if (duplicate) {
    return { passed: false, reason: `Duplicate order — same symbol and side within 60 seconds` }
  }

  // Gate 5 — Max trades per day
  const maxTrades = user.riskParams?.maxTradesPerDay || 10
  if (todayOrders.length >= maxTrades) {
    return { passed: false, reason: `Max trades per day (${maxTrades}) reached` }
  }

  return { passed: true }
}

module.exports = { check }
