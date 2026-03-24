const axios  = require('axios')
const { encrypt, decrypt } = require('../utils/encrypt')
const BrokerAccount = require('../models/BrokerAccount')

const BASE = 'https://api.kite.trade'

// ─── Internal: make authenticated request ────────────────────────────────────
const _request = async (method, path, data, accessToken, apiKey) => {
  const res = await axios({
    method,
    url: `${BASE}${path}`,
    headers: {
      'X-Kite-Version': '3',
      'Authorization':  `token ${apiKey}:${accessToken}`,
      'Content-Type':   'application/x-www-form-urlencoded',
    },
    // Kite Connect uses form-encoded bodies not JSON
    data: data ? new URLSearchParams(data).toString() : undefined,
  })
  return res.data
}

// ─── Step 1: Get OAuth login URL (redirect user to this) ──────────────────────
const getLoginURL = (apiKey) => {
  return `https://kite.trade/connect/login?api_key=${apiKey}&v=3`
}

// ─── Step 2: Exchange request_token for access_token ─────────────────────────
// Called after user returns from Zerodha OAuth with request_token
const generateSession = async ({ apiKey, apiSecret, requestToken }) => {
  const crypto = require('crypto')
  const checksum = crypto
    .createHash('sha256')
    .update(apiKey + requestToken + apiSecret)
    .digest('hex')

  const res = await axios.post(
    `${BASE}/session/token`,
    new URLSearchParams({ api_key: apiKey, request_token: requestToken, checksum }).toString(),
    { headers: { 'X-Kite-Version': '3', 'Content-Type': 'application/x-www-form-urlencoded' } }
  )

  if (!res.data || !res.data.data || !res.data.data.access_token) {
    throw new Error('Zerodha session generation failed')
  }

  return {
    accessToken: res.data.data.access_token,
    publicToken: res.data.data.public_token,
  }
}

// ─── Place order ──────────────────────────────────────────────────────────────
const placeOrder = async ({ accessToken, apiKey, order }) => {
  // map our internal order types to Zerodha's
  const orderTypeMap = { MARKET: 'MARKET', LIMIT: 'LIMIT', 'SL': 'SL', 'SL-M': 'SL-M' }
  const productMap   = { MIS: 'MIS', CNC: 'CNC', NRML: 'NRML' }

  const body = {
    tradingsymbol:   order.symbol,
    exchange:        order.exchange,
    transaction_type:order.action,         // BUY or SELL
    order_type:      orderTypeMap[order.orderType] || 'MARKET',
    product:         productMap[order.productType] || 'MIS',
    quantity:        order.qty,
    price:           order.price || 0,
    trigger_price:   order.sl || 0,
    validity:        'DAY',
  }

  const res = await _request('POST', '/orders/regular', body, accessToken, apiKey)

  if (!res.data || !res.data.order_id) {
    throw new Error(`Zerodha order failed: ${res.message || 'Unknown error'}`)
  }

  return { brokerOrderId: res.data.order_id }
}

// ─── Get order book ───────────────────────────────────────────────────────────
const getOrderBook = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/orders', null, accessToken, apiKey)
  return res.data || []
}

// ─── Get positions ────────────────────────────────────────────────────────────
const getPositions = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/positions', null, accessToken, apiKey)
  return res.data || {}
}

// ─── Get holdings ─────────────────────────────────────────────────────────────
const getHoldings = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/holdings', null, accessToken, apiKey)
  return res.data || []
}

// ─── Save session token to DB after OAuth ─────────────────────────────────────
const saveSession = async (userId, { accessToken, apiKey }) => {
  const expiry = new Date()
  expiry.setHours(23, 59, 0, 0)

  await BrokerAccount.findOneAndUpdate(
    { userId, broker: 'zerodha' },
    {
      encryptedAccessToken: encrypt(accessToken),
      tokenExpiresAt:       expiry,
      isConnected:          true,
      lastRefresh:          new Date(),
    },
    { upsert: true, new: true }
  )
}

// ─── Get decrypted token for a user ──────────────────────────────────────────
const getUserToken = async (userId) => {
  const account = await BrokerAccount.findOne({ userId, broker: 'zerodha', isConnected: true })
  if (!account || !account.encryptedAccessToken) return null
  return {
    accessToken: decrypt(account.encryptedAccessToken),
    apiKey:      decrypt(account.encryptedApiKey),
  }
}

module.exports = {
  getLoginURL,
  generateSession,
  placeOrder,
  getOrderBook,
  getPositions,
  getHoldings,
  saveSession,
  getUserToken,
}
