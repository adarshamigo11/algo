const User          = require('../models/User')
const Order         = require('../models/Order')
const BrokerAccount = require('../models/BrokerAccount')
const riskManager   = require('./riskManager')
const brokerFactory = require('../brokers/brokerFactory')
const socketManager = require('../socket/socketManager')
const paperEngine   = require('../paper/paperEngine')
const { log }       = require('../utils/auditLog')

// ─── Execute an order signal ──────────────────────────────────────────────────
const execute = async (signal) => {
  const user = await User.findById(signal.userId)
  if (!user)           throw new Error(`User ${signal.userId} not found`)
  if (!user.isActive)  throw new Error('User account is suspended')

  // automation check only applies to algo-triggered orders
  if (signal.placedBy === 'algo' && !user.automationEnabled) {
    throw new Error('Automation is disabled for this user')
  }

  // run risk checks
  const risk = await riskManager.check(user, signal)
  if (!risk.passed) {
    await _handleRiskBlock(user, signal, risk.reason)
    return { blocked: true, reason: risk.reason }
  }

  const isPaper = signal.isPaper !== undefined ? signal.isPaper : user.tradingMode === 'paper'

  if (isPaper) {
    // route to paper engine — no broker needed
    const result = await paperEngine.execute({ ...signal, isPaper: true })
    return { blocked: false, ...result }
  }

  // find user's connected broker for live orders
  const brokerAccount = await BrokerAccount.findOne({
    userId:      user._id,
    isConnected: true,
  })

  if (!brokerAccount) throw new Error('No connected broker found. Please connect a broker account.')

  // save order as pending first so it appears in UI immediately
  const order = await Order.create({
    userId:       user._id,
    broker:       brokerAccount.broker,
    symbol:       signal.symbol,
    exchange:     signal.exchange      || 'NSE',
    action:       signal.action,
    orderType:    signal.orderType     || 'MARKET',
    productType:  signal.productType   || 'MIS',
    qty:          signal.qty,
    price:        signal.price         || 0,
    sl:           signal.sl            || null,
    target:       signal.target        || null,
    status:       'pending',
    placedBy:     signal.placedBy      || 'algo',
    strategyName: signal.strategyName  || null,
    strategyId:   signal.strategyId    || null,
    userLabel:    signal.userLabel      || 'algo',
    isPaper:      false,
    reason:       signal.reason        || null,
  })

  // push pending status to user's browser
  socketManager.emitOrderUpdate(user._id, order)

  try {
    const result = await brokerFactory.placeOrder(user._id, brokerAccount.broker, {
      symbol:      signal.symbol,
      exchange:    signal.exchange    || 'NSE',
      action:      signal.action,
      orderType:   signal.orderType  || 'MARKET',
      productType: signal.productType|| 'MIS',
      qty:         signal.qty,
      price:       signal.price      || 0,
      token:       signal.token      || '',
    })

    order.status        = 'open'
    order.brokerOrderId = result.brokerOrderId
    await order.save()

  } catch (err) {
    order.status = 'rejected'
    order.reason = err.message
    await order.save()
    socketManager.emitOrderUpdate(user._id, order)
    throw err
  }

  // final update to browser
  socketManager.emitOrderUpdate(user._id, order)

  await log({
    actorId:      user._id,
    actorRole:    signal.placedBy === 'user' ? 'user' : 'system',
    actorName:    user.name,
    action:       'order_placed',
    targetUserId: user._id,
    meta: { orderId: order._id, symbol: order.symbol, action: order.action, qty: order.qty, placedBy: order.placedBy, isPaper: false },
  })

  return { blocked: false, order, brokerOrderId: order.brokerOrderId }
}

// ─── Square off a position ────────────────────────────────────────────────────
const squareOff = async ({ userId, symbol, exchange, isPaper }) => {
  return execute({
    userId, symbol,
    exchange:    exchange    || 'NSE',
    action:      'SELL',
    qty:         1,
    orderType:   'MARKET',
    productType: 'MIS',
    placedBy:    'algo',
    userLabel:   'algo',
    strategyName:'Auto Square-Off',
    isPaper:     isPaper || false,
  })
}

// ─── Handle a risk block ──────────────────────────────────────────────────────
const _handleRiskBlock = async (user, signal, reason) => {
  socketManager.emitRiskBlock(user._id, {
    symbol: signal.symbol,
    action: signal.action,
    reason,
  })

  await log({
    actorId:      user._id,
    actorRole:    'system',
    actorName:    'RiskManager',
    action:       'risk_block',
    targetUserId: user._id,
    meta:         { symbol: signal.symbol, action: signal.action, reason },
  })
}

module.exports = { execute, squareOff }