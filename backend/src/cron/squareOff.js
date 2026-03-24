const cron        = require('node-cron')
const Order       = require('../models/Order')
const brokerFactory = require('../brokers/brokerFactory')
const paperEngine = require('../paper/paperEngine')
const { log }     = require('../utils/auditLog')

// ─── Square off all open MIS positions ───────────────────────────────────────
const squareOffAll = async () => {
  console.log('[SquareOff] Starting auto square-off...')

  // find all open intraday positions (non-paper)
  const openOrders = await Order.find({
    status:      'executed',
    productType: 'MIS',
    isPaper:     false,
  }).select('userId broker symbol exchange action qty fillPrice')

  // group by userId + broker to batch
  const byUser = {}
  openOrders.forEach(o => {
    const key = `${o.userId}_${o.broker}`
    if (!byUser[key]) byUser[key] = { userId: o.userId, broker: o.broker, orders: [] }
    byUser[key].orders.push(o)
  })

  let success = 0, failed = 0

  for (const { userId, broker, orders } of Object.values(byUser)) {
    try {
      // get live positions from broker
      const positions = await brokerFactory.getPositions(userId, broker)

      for (const pos of positions) {
        if (!pos.netQty || pos.netQty === 0) continue

        const reverseAction = pos.netQty > 0 ? 'SELL' : 'BUY'
        const qty           = Math.abs(pos.netQty)

        await brokerFactory.placeOrder(userId, broker, {
          symbol:      pos.tradingSymbol || pos.symbol,
          exchange:    pos.exchange || 'NSE',
          token:       pos.symboltoken  || pos.token,
          action:      reverseAction,
          qty,
          orderType:   'MARKET',
          productType: 'MIS',
          price:       0,
        })

        await log({
          actorId:      userId,
          actorRole:    'system',
          actorName:    'SquareOffCron',
          action:       'auto_square_off',
          targetUserId: userId,
          meta:         { symbol: pos.tradingSymbol, action: reverseAction, qty, broker },
        })

        success++
      }
    } catch (err) {
      failed++
      console.error(`[SquareOff] Failed for user ${userId} on ${broker}:`, err.message)
    }
  }

  // also square off paper positions
  const openPaperOrders = await Order.find({
    status:      'executed',
    productType: 'MIS',
    isPaper:     true,
  })

  for (const o of openPaperOrders) {
    try {
      await paperEngine.squareOff({
        userId:    o.userId,
        symbol:    o.symbol,
        exchange:  o.exchange,
        qty:       o.qty,
        action:    o.action,
        currentPrice: o.fillPrice,
      })
      // mark original order as closed
      o.status = 'cancelled'
      await o.save()
    } catch (err) {
      console.error(`[SquareOff] Paper square-off failed:`, err.message)
    }
  }

  console.log(`[SquareOff] Done — ${success} live positions closed, ${failed} failed, ${openPaperOrders.length} paper positions closed`)
}

// ─── Schedule: 3:10 PM IST every weekday ─────────────────────────────────────
const startSquareOffCron = () => {
  cron.schedule('10 15 * * 1-5', squareOffAll, {
    timezone: 'Asia/Kolkata',
  })
  console.log('[SquareOff] Cron scheduled — 3:10 PM IST weekdays')
}

module.exports = { startSquareOffCron, squareOffAll }
