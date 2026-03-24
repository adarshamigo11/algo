const { Server } = require('socket.io')
const { verifyToken } = require('../utils/jwt')

let io = null

// userId → Set of socket IDs
const userSockets = new Map()

// ─── Init — attach to HTTP server ────────────────────────────────────────────
const init = (httpServer) => {
  io = new Server(httpServer, {
    cors: { origin: '*' },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('No token'))

    try {
      const decoded = verifyToken(token)
      socket.userId = decoded.id
      socket.role   = decoded.role
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { userId } = socket

    // track socket → userId
    if (!userSockets.has(userId)) userSockets.set(userId, new Set())
    userSockets.get(userId).add(socket.id)

    // join a room named after their userId for targeted events
    socket.join(userId)

    console.log(`[Socket] User ${userId} connected (${socket.id})`)

    socket.on('disconnect', () => {
      const sockets = userSockets.get(userId)
      if (sockets) {
        sockets.delete(socket.id)
        if (sockets.size === 0) userSockets.delete(userId)
      }
      console.log(`[Socket] User ${userId} disconnected`)
    })
  })

  console.log('[Socket] Socket.io initialised')
}

// ─── Emit live price tick to ALL connected users ──────────────────────────────
const emitTick = (tick) => {
  if (!io) return
  io.emit('live_price', {
    symbol:    tick.symbol,
    token:     tick.token,
    ltp:       tick.ltp,
    open:      tick.open,
    high:      tick.high,
    low:       tick.low,
    close:     tick.close,
    volume:    tick.volume,
    timestamp: tick.timestamp,
  })
}

// ─── Emit order update to a SPECIFIC user ────────────────────────────────────
const emitOrderUpdate = (userId, order) => {
  if (!io) return
  io.to(String(userId)).emit('order_update', {
    orderId:      order._id,
    symbol:       order.symbol,
    action:       order.action,
    qty:          order.qty,
    fillPrice:    order.fillPrice,
    status:       order.status,
    userLabel:    order.userLabel,
    strategyName: order.strategyName,
    isPaper:      order.isPaper,
    timestamp:    order.updatedAt,
  })
}

// ─── Emit strategy signal to a specific user ──────────────────────────────────
const emitStrategySignal = (userId, signal) => {
  if (!io) return
  io.to(String(userId)).emit('strategy_signal', {
    strategyName: signal.strategyName,
    symbol:       signal.symbol,
    action:       signal.action,
    price:        signal.price,
    reason:       signal.reason,
    timestamp:    new Date().toISOString(),
  })
}

// ─── Emit risk block notification to a specific user ─────────────────────────
const emitRiskBlock = (userId, { reason, symbol, action }) => {
  if (!io) return
  io.to(String(userId)).emit('risk_block', { reason, symbol, action, timestamp: new Date().toISOString() })
}

// ─── Emit token expiry warning to a specific user ────────────────────────────
const emitTokenExpiry = (userId, { broker, expiresAt }) => {
  if (!io) return
  io.to(String(userId)).emit('token_expiry', { broker, expiresAt })
}

const getConnectedCount = () => userSockets.size

module.exports = {
  init,
  emitTick,
  emitOrderUpdate,
  emitStrategySignal,
  emitRiskBlock,
  emitTokenExpiry,
  getConnectedCount,
}
