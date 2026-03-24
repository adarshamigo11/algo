const express = require('express')
const router  = express.Router()

const BrokerAccount = require('../../models/BrokerAccount')
const { protect, allow, hasPermission } = require('../../middleware/auth')
const { encrypt, decrypt } = require('../../utils/encrypt')
const { log } = require('../../utils/auditLog')

router.use(protect)
router.use(allow('admin', 'subadmin'))

// ─── GET /api/admin/brokers/:userId — get broker connection status for a user ──
router.get('/:userId', async (req, res) => {
  try {
    const accounts = await BrokerAccount.find({ userId: req.params.userId })
      .select('-encryptedApiKey -encryptedTotp -encryptedPin -encryptedApiSecret -encryptedAccessToken')
    res.json(accounts)
  } catch (err) {
    console.error('Get broker accounts error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/brokers/angelone — save Angel One credentials for a user ──
router.post('/angelone', hasPermission('manageBrokerKeys'), async (req, res) => {
  const { userId, clientId, apiKey, pin, totpSecret } = req.body

  if (!userId || !clientId || !apiKey || !pin || !totpSecret) {
    return res.status(400).json({ message: 'userId, clientId, apiKey, pin, totpSecret are required' })
  }

  try {
    await BrokerAccount.findOneAndUpdate(
      { userId, broker: 'angelone' },
      {
        userId,
        broker: 'angelone',
        clientId,
        encryptedApiKey:  encrypt(apiKey),
        encryptedPin:     encrypt(pin),
        encryptedTotp:    encrypt(totpSecret),
        isConnected:      false, // will become true after first successful token refresh
      },
      { upsert: true, new: true }
    )

    await log({
      actorId: req.actor._id, actorRole: req.actor.role, actorName: req.actor.name,
      action: 'broker_keys_saved', targetUserId: userId,
      meta: { broker: 'angelone' },
    })

    res.json({ message: 'Angel One credentials saved' })
  } catch (err) {
    console.error('Save Angel One error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/brokers/zerodha — save Zerodha API key + secret ──────────
router.post('/zerodha', hasPermission('manageBrokerKeys'), async (req, res) => {
  const { userId, apiKey, apiSecret } = req.body

  if (!userId || !apiKey || !apiSecret) {
    return res.status(400).json({ message: 'userId, apiKey, apiSecret are required' })
  }

  try {
    await BrokerAccount.findOneAndUpdate(
      { userId, broker: 'zerodha' },
      {
        userId,
        broker: 'zerodha',
        encryptedApiKey:    encrypt(apiKey),
        encryptedApiSecret: encrypt(apiSecret),
        isConnected:        false, // becomes true after OAuth
      },
      { upsert: true, new: true }
    )

    await log({
      actorId: req.actor._id, actorRole: req.actor.role, actorName: req.actor.name,
      action: 'broker_keys_saved', targetUserId: userId,
      meta: { broker: 'zerodha' },
    })

    res.json({ message: 'Zerodha credentials saved' })
  } catch (err) {
    console.error('Save Zerodha error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── DELETE /api/admin/brokers/:userId/:broker — disconnect a broker ──────────
router.delete('/:userId/:broker', hasPermission('manageBrokerKeys'), async (req, res) => {
  try {
    await BrokerAccount.findOneAndUpdate(
      { userId: req.params.userId, broker: req.params.broker },
      { isConnected: false, encryptedAccessToken: null }
    )

    await log({
      actorId: req.actor._id, actorRole: req.actor.role, actorName: req.actor.name,
      action: 'broker_disconnected', targetUserId: req.params.userId,
      meta: { broker: req.params.broker },
    })

    res.json({ message: 'Broker disconnected' })
  } catch (err) {
    console.error('Disconnect broker error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
