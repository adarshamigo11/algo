const express = require('express')
const router  = express.Router()
const BrokerAccount = require('../../models/BrokerAccount')
const { protect, allow } = require('../../middleware/auth')
const { encrypt, decrypt } = require('../../utils/encrypt')
const angelone = require('../../brokers/angelone')
const zerodha  = require('../../brokers/zerodha')
const { log }  = require('../../utils/auditLog')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/brokers ────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const accounts = await BrokerAccount.find({ userId: req.actor._id })
      .select('broker isConnected lastRefresh tokenExpiresAt clientId')
    res.json(accounts)
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/user/brokers/angelone — user saves their own Angel One creds ───
router.post('/angelone', async (req, res) => {
  const { clientId, apiKey, pin, totpSecret } = req.body

  if (!clientId || !apiKey || !pin || !totpSecret) {
    return res.status(400).json({ message: 'clientId, apiKey, pin, totpSecret required' })
  }

  try {
    // test the credentials immediately
    const tokens = await angelone.login({ clientId, apiKey, pin, totpSecret })

    const expiry = new Date()
    expiry.setHours(23, 59, 0, 0)

    await BrokerAccount.findOneAndUpdate(
      { userId: req.actor._id, broker: 'angelone' },
      {
        userId: req.actor._id,
        broker: 'angelone',
        clientId,
        encryptedApiKey:      encrypt(apiKey),
        encryptedPin:         encrypt(pin),
        encryptedTotp:        encrypt(totpSecret),
        encryptedAccessToken: encrypt(tokens.jwtToken),
        tokenExpiresAt:       expiry,
        isConnected:          true,
        lastRefresh:          new Date(),
      },
      { upsert: true, new: true }
    )

    await log({
      actorId: req.actor._id, actorRole: 'user', actorName: req.actor.name,
      action: 'broker_connected', targetUserId: req.actor._id,
      meta: { broker: 'angelone' },
    })

    res.json({ message: 'Angel One connected successfully' })
  } catch (err) {
    console.error('Angel One connect error:', err.message)
    res.status(400).json({ message: `Connection failed: ${err.message}` })
  }
})

// ─── GET /api/user/brokers/zerodha/login-url — return OAuth URL ───────────────
router.get('/zerodha/login-url', async (req, res) => {
  try {
    const account = await BrokerAccount.findOne({ userId: req.actor._id, broker: 'zerodha' })
    if (!account || !account.encryptedApiKey) {
      return res.status(400).json({ message: 'Zerodha API key not configured. Contact admin.' })
    }
    const apiKey = decrypt(account.encryptedApiKey)
    const url    = zerodha.getLoginURL(apiKey)
    res.json({ url })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── DELETE /api/user/brokers/:broker ─────────────────────────────────────────
router.delete('/:broker', async (req, res) => {
  try {
    await BrokerAccount.findOneAndUpdate(
      { userId: req.actor._id, broker: req.params.broker },
      { isConnected: false, encryptedAccessToken: null }
    )

    await log({
      actorId: req.actor._id, actorRole: 'user', actorName: req.actor.name,
      action: 'broker_disconnected', targetUserId: req.actor._id,
      meta: { broker: req.params.broker },
    })

    res.json({ message: 'Disconnected' })
  } catch (err) {
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
