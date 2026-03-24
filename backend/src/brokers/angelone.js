const axios  = require('axios')
const { totp } = require('otplib')
const { encrypt, decrypt } = require('../utils/encrypt')
const BrokerAccount = require('../models/BrokerAccount')

const BASE = 'https://apiconnect.angelone.in'

// ─── Internal: make authenticated request ────────────────────────────────────
const _request = async (method, path, data, token, apiKey) => {
  const res = await axios({
    method,
    url: `${BASE}${path}`,
    headers: {
      'Content-Type':  'application/json',
      'Accept':        'application/json',
      'X-UserType':    'USER',
      'X-SourceID':    'WEB',
      'X-ClientLocalIP': '127.0.0.1',
      'X-ClientPublicIP': '127.0.0.1',
      'X-MACAddress':  '00:00:00:00:00:00',
      'X-PrivateKey':  apiKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data,
  })
  return res.data
}

// ─── Login (called by cron daily at 8 AM) ────────────────────────────────────
// For admin account: uses env variables
// For user account: uses their saved credentials from BrokerAccount
const login = async ({ clientId, apiKey, pin, totpSecret }) => {
  const totpCode = totp.generate(totpSecret)

  const body = {
    clientcode: clientId,
    password:   pin,
    totp:       totpCode,
  }

  const res = await _request('POST', '/rest/auth/angelbroking/user/v1/loginByPassword', body, null, apiKey)

  if (!res.data || !res.data.jwtToken) {
    throw new Error(`Angel One login failed: ${res.message || 'Unknown error'}`)
  }

  return {
    jwtToken:     res.data.jwtToken,
    refreshToken: res.data.refreshToken,
    feedToken:    res.data.feedToken,
  }
}

// ─── Refresh token ────────────────────────────────────────────────────────────
const refreshToken = async ({ refreshToken: rt, apiKey }) => {
  const res = await _request(
    'POST',
    '/rest/auth/angelbroking/jwt/v1/generateTokens',
    { refreshToken: rt },
    null,
    apiKey
  )
  if (!res.data || !res.data.jwtToken) {
    throw new Error('Angel One token refresh failed')
  }
  return { jwtToken: res.data.jwtToken, feedToken: res.data.feedToken }
}

// ─── Place order ──────────────────────────────────────────────────────────────
const placeOrder = async ({ accessToken, apiKey, order }) => {
  const body = {
    variety:         'NORMAL',
    tradingsymbol:   order.symbol,
    symboltoken:     order.token,
    transactiontype: order.action,        // BUY or SELL
    exchange:        order.exchange,
    ordertype:       order.orderType,     // MARKET, LIMIT, STOPLOSS_LIMIT, STOPLOSS_MARKET
    producttype:     order.productType,   // INTRADAY, DELIVERY, CARRYFORWARD
    duration:        'DAY',
    price:           order.price || '0',
    squareoff:       '0',
    stoploss:        '0',
    quantity:        String(order.qty),
  }

  const res = await _request('POST', '/rest/secure/angelbroking/order/v1/placeOrder', body, accessToken, apiKey)

  if (!res.data || !res.data.orderid) {
    throw new Error(`Order placement failed: ${res.message || 'Unknown error'}`)
  }

  return { brokerOrderId: res.data.orderid }
}

// ─── Get order book ───────────────────────────────────────────────────────────
const getOrderBook = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/rest/secure/angelbroking/order/v1/getOrderBook', null, accessToken, apiKey)
  return res.data || []
}

// ─── Get positions ────────────────────────────────────────────────────────────
const getPositions = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/rest/secure/angelbroking/order/v1/getPosition', null, accessToken, apiKey)
  return res.data || []
}

// ─── Get holdings ─────────────────────────────────────────────────────────────
const getHoldings = async ({ accessToken, apiKey }) => {
  const res = await _request('GET', '/rest/secure/angelbroking/portfolio/v1/getHolding', null, accessToken, apiKey)
  return res.data || []
}

// ─── Get LTP for a list of tokens ────────────────────────────────────────────
const getLTP = async ({ accessToken, apiKey, tokens }) => {
  // tokens = [{ exchange: 'NSE', symboltoken: '3045', tradingsymbol: 'SBIN-EQ' }]
  const body = { mode: 'LTP', exchangeTokens: tokens }
  const res = await _request('POST', '/rest/secure/angelbroking/market/v1/quote', body, accessToken, apiKey)
  return res.data || {}
}

// ─── Get historical candles ───────────────────────────────────────────────────
const getCandles = async ({ accessToken, apiKey, exchange, symboltoken, interval, fromdate, todate }) => {
  // interval: ONE_MINUTE, FIVE_MINUTE, FIFTEEN_MINUTE, ONE_DAY
  const body = { exchange, symboltoken, interval, fromdate, todate }
  const res = await _request('POST', '/rest/secure/angelbroking/historical/v1/getCandleData', body, accessToken, apiKey)
  return res.data || []
}

// ─── Refresh and save user token to DB ───────────────────────────────────────
// Call this from the daily cron to refresh all connected user accounts
const refreshAndSaveUserToken = async (userId) => {
  const account = await BrokerAccount.findOne({ userId, broker: 'angelone', isConnected: true })
  if (!account) return

  const clientId   = account.clientId
  const apiKey     = decrypt(account.encryptedApiKey)
  const pin        = decrypt(account.encryptedPin)
  const totpSecret = decrypt(account.encryptedTotp)

  const tokens = await login({ clientId, apiKey, pin, totpSecret })

  // set expiry to end of trading day
  const expiry = new Date()
  expiry.setHours(23, 59, 0, 0)

  account.encryptedAccessToken = encrypt(tokens.jwtToken)
  account.tokenExpiresAt       = expiry
  account.lastRefresh          = new Date()
  await account.save()

  return tokens.jwtToken
}

// ─── Get decrypted access token for a user ────────────────────────────────────
const getUserToken = async (userId) => {
  const account = await BrokerAccount.findOne({ userId, broker: 'angelone', isConnected: true })
  if (!account || !account.encryptedAccessToken) return null
  return {
    accessToken: decrypt(account.encryptedAccessToken),
    apiKey:      decrypt(account.encryptedApiKey),
  }
}

module.exports = {
  login,
  refreshToken,
  placeOrder,
  getOrderBook,
  getPositions,
  getHoldings,
  getLTP,
  getCandles,
  refreshAndSaveUserToken,
  getUserToken,
}
