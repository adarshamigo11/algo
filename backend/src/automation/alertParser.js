// Parses and validates the JSON payload that TradingView sends.
// Returns a clean signal object or throws if the payload is invalid.

const parse = (body) => {
  const { userId, symbol, exchange, action, qty, price, orderType,
          productType, strategyName, sl, target } = body

  if (!userId)  throw new Error('Missing userId in webhook payload')
  if (!symbol)  throw new Error('Missing symbol')
  if (!action)  throw new Error('Missing action')

  const cleanAction = String(action).toUpperCase()
  if (!['BUY', 'SELL'].includes(cleanAction)) {
    throw new Error(`Invalid action: ${action} — must be BUY or SELL`)
  }

  return {
    userId,
    symbol:       String(symbol).toUpperCase(),
    exchange:     String(exchange || 'NSE').toUpperCase(),
    action:       cleanAction,
    qty:          parseInt(qty)    || 1,
    price:        parseFloat(price)|| 0,
    orderType:    String(orderType  || 'MARKET').toUpperCase(),
    productType:  String(productType|| 'MIS').toUpperCase(),
    strategyName: strategyName || 'TradingView Alert',
    sl:           sl     ? parseFloat(sl)     : null,
    target:       target ? parseFloat(target) : null,
    placedBy:     'algo',
    userLabel:    'algo',
  }
}

module.exports = { parse }
