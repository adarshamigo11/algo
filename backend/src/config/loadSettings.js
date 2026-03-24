// Loads platform credentials from MongoDB into process.env on startup.
// This means even if .env has no Angel One keys, the server will use
// whatever the admin saved from the settings panel.

const { decrypt } = require('../utils/encrypt')

const loadSettings = async () => {
  try {
    const PlatformConfig = require('../models/PlatformConfig')
    const KEYS = ['ANGELONE_CLIENT_ID','ANGELONE_API_KEY','ANGELONE_TOTP_SECRET','ANGELONE_PIN']
    const docs = await PlatformConfig.find({ key: { $in: KEYS } })

    let loaded = 0
    docs.forEach(doc => {
      const val = decrypt(doc.value)
      if (val) {
        process.env[doc.key] = val
        loaded++
      }
    })

    if (loaded > 0) {
      console.log(`[Settings] Loaded ${loaded} platform credentials from database`)
    }
  } catch (err) {
    // not fatal — .env values will be used if DB load fails
    console.warn('[Settings] Could not load settings from DB:', err.message)
  }
}

module.exports = loadSettings