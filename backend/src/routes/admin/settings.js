const express  = require('express')
const router   = express.Router()
const PlatformConfig = require('../../models/PlatformConfig')
const { protect, allow } = require('../../middleware/auth')
const { encrypt, decrypt } = require('../../utils/encrypt')
const { log } = require('../../utils/auditLog')

router.use(protect)
router.use(allow('admin'))

// keys we store — never expose raw values to frontend
const KEYS = ['ANGELONE_CLIENT_ID', 'ANGELONE_API_KEY', 'ANGELONE_TOTP_SECRET', 'ANGELONE_PIN']

// ─── GET /api/admin/settings — return masked values ──────────────────────────
router.get('/', async (req, res) => {
  try {
    const docs   = await PlatformConfig.find({ key: { $in: KEYS } })
    const result = {}

    KEYS.forEach(k => {
      const doc = docs.find(d => d.key === k)
      if (doc) {
        const raw = decrypt(doc.value)
        // mask all but last 4 chars
        result[k] = raw ? '•'.repeat(Math.max(0, raw.length - 4)) + raw.slice(-4) : ''
        result[`${k}_set`] = true
      } else {
        result[k]          = ''
        result[`${k}_set`] = false
      }
    })

    res.json(result)
  } catch (err) {
    console.error('Get settings error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/settings — save / update credentials ────────────────────
router.post('/', async (req, res) => {
  const { clientId, apiKey, totpSecret, pin } = req.body

  if (!clientId || !apiKey || !totpSecret || !pin) {
    return res.status(400).json({ message: 'All four fields are required' })
  }

  try {
    const updates = [
      { key: 'ANGELONE_CLIENT_ID',   value: encrypt(clientId) },
      { key: 'ANGELONE_API_KEY',     value: encrypt(apiKey) },
      { key: 'ANGELONE_TOTP_SECRET', value: encrypt(totpSecret) },
      { key: 'ANGELONE_PIN',         value: encrypt(pin) },
    ]

    for (const u of updates) {
      await PlatformConfig.findOneAndUpdate(
        { key: u.key },
        { key: u.key, value: u.value },
        { upsert: true, new: true }
      )
    }

    // update process.env so the running server uses the new values immediately
    // without needing a restart
    process.env.ANGELONE_CLIENT_ID   = clientId
    process.env.ANGELONE_API_KEY     = apiKey
    process.env.ANGELONE_TOTP_SECRET = totpSecret
    process.env.ANGELONE_PIN         = pin

    await log({
      actorId:   req.actor._id,
      actorRole: 'admin',
      actorName: req.actor.name,
      action:    'platform_settings_updated',
      meta:      { keys: ['ANGELONE_CLIENT_ID', 'ANGELONE_API_KEY', 'ANGELONE_TOTP_SECRET', 'ANGELONE_PIN'] },
    })

    res.json({ message: 'Angel One credentials saved successfully' })
  } catch (err) {
    console.error('Save settings error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/settings/test — test the credentials ────────────────────
router.post('/test', async (req, res) => {
  try {
    const angelone = require('../../brokers/angelone')

    // read from DB (most up to date)
    const docs = await PlatformConfig.find({ key: { $in: KEYS } })
    const get  = (k) => {
      const doc = docs.find(d => d.key === k)
      return doc ? decrypt(doc.value) : process.env[k]
    }

    const clientId   = get('ANGELONE_CLIENT_ID')
    const apiKey     = get('ANGELONE_API_KEY')
    const totpSecret = get('ANGELONE_TOTP_SECRET')
    const pin        = get('ANGELONE_PIN')

    if (!clientId || !apiKey || !totpSecret || !pin) {
      return res.status(400).json({ message: 'Credentials not set yet' })
    }

    const tokens = await angelone.login({ clientId, apiKey, pin, totpSecret })

    // store tokens in memory for WebSocket and candle API use
    process.env._ADMIN_FEED_TOKEN = tokens.feedToken
    process.env._ADMIN_JWT_TOKEN  = tokens.jwtToken

    res.json({ message: 'Connection successful — Angel One logged in', feedToken: '••••' + tokens.feedToken.slice(-6) })
  } catch (err) {
    console.error('Test connection error:', err.message)
    res.status(400).json({ message: `Connection failed: ${err.message}` })
  }
})

module.exports = router