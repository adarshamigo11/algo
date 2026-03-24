const { WebSocket } = require('ws')
const { totp }      = require('otplib')
const axios         = require('axios')
const candleBuilder = require('./candleBuilder')

// ─── State ────────────────────────────────────────────────────────────────────
let ws            = null
let feedToken     = null
let jwtToken      = null
let reconnectTimer= null
let isConnected   = false

// symbols currently subscribed — Map of token → { symbol, exchange }
const subscriptions = new Map()

// callbacks registered by other modules
const onTickCallbacks = []

// ─── Login to get feedToken ───────────────────────────────────────────────────
const login = async () => {
  const totpCode = totp.generate(process.env.ANGELONE_TOTP_SECRET)

  const res = await axios.post(
    'https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword',
    {
      clientcode: process.env.ANGELONE_CLIENT_ID,
      password:   process.env.ANGELONE_PIN,
      totp:       totpCode,
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'X-UserType':   'USER',
        'X-SourceID':   'WEB',
        'X-ClientLocalIP':  '127.0.0.1',
        'X-ClientPublicIP': '127.0.0.1',
        'X-MACAddress':     '00:00:00:00:00:00',
        'X-PrivateKey': process.env.ANGELONE_API_KEY,
      },
    }
  )

  if (!res.data?.data?.jwtToken) throw new Error('Angel One login failed for market data')
  feedToken = res.data.data.feedToken
  jwtToken  = res.data.data.jwtToken

  // store in process env so tokenRefresh cron can access them
  process.env._ADMIN_FEED_TOKEN = feedToken
  process.env._ADMIN_JWT_TOKEN  = jwtToken

  console.log('[MarketData] Angel One login successful')
}

// ─── Connect WebSocket ────────────────────────────────────────────────────────
const connect = async () => {
  if (!feedToken) await login()

  const url = `wss://smartapisocket.angelone.in/smart-stream`

  ws = new WebSocket(url, {
    headers: {
      Authorization:  `Bearer ${jwtToken}`,
      'x-feed-token': feedToken,
      'x-client-code':process.env.ANGELONE_CLIENT_ID,
      'x-api-key':    process.env.ANGELONE_API_KEY,
    },
  })

  ws.on('open', () => {
    isConnected = true
    console.log('[MarketData] WebSocket connected')
    // re-subscribe to all symbols after reconnect
    if (subscriptions.size > 0) _sendSubscription()
  })

  ws.on('message', (data) => {
    try {
      const tick = _parseTick(data)
      if (!tick) return
      // push to candle builder
      candleBuilder.onTick(tick)
      // push to all registered callbacks (Socket.io etc)
      onTickCallbacks.forEach(cb => cb(tick))
    } catch (err) {
      console.error('[MarketData] Tick parse error:', err.message)
    }
  })

  ws.on('close', () => {
    isConnected = false
    console.warn('[MarketData] WebSocket closed — reconnecting in 5s')
    reconnectTimer = setTimeout(connect, 5000)
  })

  ws.on('error', (err) => {
    console.error('[MarketData] WebSocket error:', err.message)
  })
}

// ─── Subscribe to symbols ─────────────────────────────────────────────────────
// tokens = [{ token: '26000', exchange: 'NSE' }, ...]
const subscribe = (tokens) => {
  tokens.forEach(t => subscriptions.set(t.token, t))
  if (isConnected) _sendSubscription()
}

const unsubscribe = (tokens) => {
  tokens.forEach(t => subscriptions.delete(t.token))
  if (isConnected) _sendUnsubscription(tokens)
}

const _sendSubscription = () => {
  const tokenList = Array.from(subscriptions.values())
  const payload = {
    action:      1,  // 1 = subscribe
    params: {
      mode:         3, // 3 = SNAP_QUOTE (full data)
      tokenList: [
        {
          exchangeType: 1, // NSE
          tokens: tokenList
            .filter(t => t.exchange === 'NSE')
            .map(t => t.token),
        },
        {
          exchangeType: 2, // NFO
          tokens: tokenList
            .filter(t => t.exchange === 'NFO')
            .map(t => t.token),
        },
      ].filter(g => g.tokens.length > 0),
    },
  }
  ws.send(JSON.stringify(payload))
}

const _sendUnsubscription = (tokens) => {
  const payload = {
    action: 0, // 0 = unsubscribe
    params: {
      mode: 3,
      tokenList: [{ exchangeType: 1, tokens: tokens.map(t => t.token) }],
    },
  }
  ws.send(JSON.stringify(payload))
}

// ─── Parse binary tick from Angel One ────────────────────────────────────────
// Angel One sends binary frames — this parses the standard SNAP_QUOTE format
const _parseTick = (data) => {
  // Angel One WebSocket V2 sends JSON in development/sandbox
  // In production it sends binary — handle both
  if (typeof data === 'string' || data instanceof Buffer) {
    try {
      const json = JSON.parse(data.toString())
      if (!json.tk) return null // not a tick frame
      return {
        token:     json.tk,
        exchange:  json.e  || 'NSE',
        symbol:    json.ts || json.tk,
        ltp:       parseFloat(json.ltp) || 0,
        open:      parseFloat(json.op)  || 0,
        high:      parseFloat(json.h)   || 0,
        low:       parseFloat(json.l)   || 0,
        close:     parseFloat(json.c)   || 0,
        volume:    parseInt(json.v)     || 0,
        timestamp: Date.now(),
      }
    } catch {
      return null
    }
  }
  return null
}

// ─── Register a callback for every incoming tick ──────────────────────────────
const onTick = (callback) => {
  onTickCallbacks.push(callback)
}

// ─── Disconnect cleanly ───────────────────────────────────────────────────────
const disconnect = () => {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (ws) ws.close()
  isConnected = false
}

const getStatus = () => ({
  isConnected,
  subscriptions: subscriptions.size,
})

module.exports = { connect, subscribe, unsubscribe, onTick, disconnect, getStatus, login }
