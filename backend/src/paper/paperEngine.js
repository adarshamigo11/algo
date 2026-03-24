const Order = require('../models/Order')
const { log } = require('../utils/auditLog')

// Simulates an order fill at current market price.
// No real broker call — just saves the order as executed in MongoDB.

const execute = async (signal) => {
  const {
    userId, symbol, exchange, action, qty,
    price, orderType, productType, strategyName,
    strategyId, placedBy, userLabel, sl, target, reason,
  } = signal

  // simulate fill at the signal price (or a small random slippage)
  const slippage  = price * 0.0002 // 0.02% slippage simulation
  const fillPrice = action === 'BUY'
    ? parseFloat((price + slippage).toFixed(2))
    : parseFloat((price - slippage).toFixed(2))

  const order = await Order.create({
    userId,
    broker:       'paper',
    brokerOrderId:`PAPER_${Date.now()}`,
    symbol,
    exchange,
    action,
    orderType:    orderType || 'MARKET',
    productType:  productType || 'MIS',
    qty,
    price:        price || 0,
    sl:           sl    || null,
    target:       target|| null,
    status:       'executed',
    fillPrice,
    placedBy:     placedBy || 'algo',
    userLabel:    userLabel || 'algo',
    strategyName: strategyName || null,
    strategyId:   strategyId   || null,
    isPaper:      true,
    reason:       reason || null,
  })

  await log({
    actorId:      userId,
    actorRole:    'system',
    actorName:    'PaperEngine',
    action:       'paper_order_executed',
    targetUserId: userId,
    meta: {
      symbol, action, qty, fillPrice,
      strategyName, orderId: order._id,
    },
  })

  console.log(`[PaperEngine] ${action} ${qty} ${symbol} @ ${fillPrice} (simulated) for user ${userId}`)

  return { orderId: order._id, fillPrice, isPaper: true }
}

// Square off a paper position — place a reverse order
const squareOff = async ({ userId, symbol, exchange, qty, action, currentPrice }) => {
  const reverseAction = action === 'BUY' ? 'SELL' : 'BUY'

  return execute({
    userId,
    symbol,
    exchange:     exchange || 'NSE',
    action:       reverseAction,
    qty,
    price:        currentPrice || 0,
    orderType:    'MARKET',
    productType:  'MIS',
    strategyName: 'Auto Square-Off',
    placedBy:     'algo',
    userLabel:    'algo',
    isPaper:      true,
    reason:       'Auto square-off at 3:10 PM',
  })
}

module.exports = { execute, squareOff }
