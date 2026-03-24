const express       = require('express')
const router        = express.Router()
const alertParser   = require('../automation/alertParser')
const orderExecutor = require('../automation/orderExecutor')
const { log }       = require('../utils/auditLog')

// POST /api/alert
// Called by TradingView. Body must include secret field matching env.WEBHOOK_SECRET
router.post('/', async (req, res) => {
  // validate secret first — reject immediately if wrong
  if (req.body.secret !== process.env.WEBHOOK_SECRET) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  let signal
  try {
    signal = alertParser.parse(req.body)
  } catch (err) {
    return res.status(400).json({ message: err.message })
  }

  // log the webhook receipt regardless of outcome
  await log({
    actorId:      signal.userId,
    actorRole:    'system',
    actorName:    'TradingView',
    action:       'webhook_received',
    targetUserId: signal.userId,
    meta:         { symbol: signal.symbol, action: signal.action, strategy: signal.strategyName },
  })

  // respond to TradingView immediately — don't wait for order execution
  res.json({ message: 'Alert received' })

  // execute async (errors logged internally)
  try {
    await orderExecutor.executeSignal(signal)
  } catch (err) {
    console.error('[Webhook] Order execution failed:', err.message)
  }
})

module.exports = router
