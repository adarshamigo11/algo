const angelone = require('./angelone')
const zerodha  = require('./zerodha')

// Returns a unified interface regardless of which broker the user has connected.
// All callers use the same method names — broker difference is hidden here.

const getAdapter = (broker) => {
  const adapters = { angelone, zerodha }
  const adapter  = adapters[broker]
  if (!adapter) throw new Error(`Unsupported broker: ${broker}`)
  return adapter
}

// Place an order for a user — fetches their token internally
const placeOrder = async (userId, broker, order) => {
  const adapter   = getAdapter(broker)
  const tokenData = await adapter.getUserToken(userId)

  if (!tokenData) {
    throw new Error(`No active ${broker} session for user ${userId}. Please reconnect.`)
  }

  return adapter.placeOrder({ ...tokenData, order })
}

// Get positions for a user
const getPositions = async (userId, broker) => {
  const adapter   = getAdapter(broker)
  const tokenData = await adapter.getUserToken(userId)
  if (!tokenData) return []
  return adapter.getPositions(tokenData)
}

// Get order book for a user
const getOrderBook = async (userId, broker) => {
  const adapter   = getAdapter(broker)
  const tokenData = await adapter.getUserToken(userId)
  if (!tokenData) return []
  return adapter.getOrderBook(tokenData)
}

// Get holdings for a user
const getHoldings = async (userId, broker) => {
  const adapter   = getAdapter(broker)
  const tokenData = await adapter.getUserToken(userId)
  if (!tokenData) return []
  return adapter.getHoldings(tokenData)
}

module.exports = { placeOrder, getPositions, getOrderBook, getHoldings, getAdapter }
