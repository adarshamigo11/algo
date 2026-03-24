const cron = require('node-cron')
const BrokerAccount = require('../models/BrokerAccount')
const angelone      = require('../brokers/angelone')
const { log }       = require('../utils/auditLog')

// ─── Refresh all Angel One user tokens ───────────────────────────────────────
const refreshAllAngelOneTokens = async () => {
  console.log('[TokenRefresh] Starting Angel One token refresh...')

  const accounts = await BrokerAccount.find({ broker: 'angelone', isConnected: true })
  let success = 0, failed = 0

  for (const account of accounts) {
    try {
      await angelone.refreshAndSaveUserToken(account.userId)
      success++
    } catch (err) {
      failed++
      console.error(`[TokenRefresh] Failed for user ${account.userId}:`, err.message)

      // mark as disconnected so UI shows the warning
      account.isConnected = false
      await account.save()

      await log({
        actorId:      account.userId,
        actorRole:    'system',
        actorName:    'TokenRefreshCron',
        action:       'token_refresh_failed',
        targetUserId: account.userId,
        meta:         { broker: 'angelone', error: err.message },
      })
    }
  }

  console.log(`[TokenRefresh] Done — ${success} success, ${failed} failed`)
}

// ─── Also refresh the admin's market data account ────────────────────────────
const refreshAdminToken = async () => {
  try {
    const tokens = await angelone.login({
      clientId:   process.env.ANGELONE_CLIENT_ID,
      apiKey:     process.env.ANGELONE_API_KEY,
      pin:        process.env.ANGELONE_PIN,
      totpSecret: process.env.ANGELONE_TOTP_SECRET,
    })
    // store admin feed token in memory for WebSocket (Phase 2)
    process.env._ADMIN_FEED_TOKEN = tokens.feedToken
    process.env._ADMIN_JWT_TOKEN  = tokens.jwtToken
    console.log('[TokenRefresh] Admin Angel One token refreshed')
  } catch (err) {
    console.error('[TokenRefresh] Admin token refresh failed:', err.message)
  }
}

// ─── Schedule: 8:00 AM IST every weekday (Mon–Fri) ───────────────────────────
// Cron: '0 8 * * 1-5'  — but note node-cron runs in server timezone
// Set TZ=Asia/Kolkata on your server OR adjust the time accordingly
const startTokenRefreshCron = () => {
  cron.schedule('0 8 * * 1-5', async () => {
    await refreshAdminToken()
    await refreshAllAngelOneTokens()
  }, {
    timezone: 'Asia/Kolkata',
  })

  console.log('[TokenRefresh] Cron scheduled — 8:00 AM IST weekdays')
}

module.exports = { startTokenRefreshCron, refreshAdminToken, refreshAllAngelOneTokens }
