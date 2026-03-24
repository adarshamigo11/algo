// Receives raw ticks and assembles them into closed OHLCV candles.
// Supported timeframes: 1, 5, 15, 60 minutes and 1D.
// On every candle close, fires onCandleClose callbacks.

const TIMEFRAMES = [1, 5, 15, 60] // minutes

// candles[token][timeframe] = { open, high, low, close, volume, openTime, closeTime }
const candles = {}

// registered callbacks — called when a candle closes
const onCandleCloseCallbacks = []

// ─── Receive a tick ───────────────────────────────────────────────────────────
const onTick = (tick) => {
  const { token, symbol, exchange, ltp, volume, timestamp } = tick
  if (!ltp || ltp === 0) return

  const now = new Date(timestamp)

  TIMEFRAMES.forEach(tf => {
    const key = `${token}_${tf}`
    if (!candles[key]) candles[key] = null

    const slotStart = _getSlotStart(now, tf)
    const slotEnd   = new Date(slotStart.getTime() + tf * 60 * 1000)

    const current = candles[key]

    if (!current || current.openTime.getTime() !== slotStart.getTime()) {
      // previous candle is now closed — fire callbacks
      if (current) {
        _fireCandleClose(current, token, symbol, exchange, tf)
      }
      // start a new candle
      candles[key] = {
        token, symbol, exchange,
        timeframe:  tf,
        open:       ltp,
        high:       ltp,
        low:        ltp,
        close:      ltp,
        volume:     volume || 0,
        openTime:   slotStart,
        closeTime:  new Date(slotEnd.getTime() - 1000),
      }
    } else {
      // update current candle
      current.high   = Math.max(current.high, ltp)
      current.low    = Math.min(current.low, ltp)
      current.close  = ltp
      current.volume += (volume || 0)
    }
  })
}

// ─── Get slot start for a given time and timeframe ───────────────────────────
const _getSlotStart = (date, tf) => {
  const d     = new Date(date)
  const mins  = d.getMinutes()
  const slot  = Math.floor(mins / tf) * tf
  d.setMinutes(slot, 0, 0)
  return d
}

// ─── Fire candle close callbacks ─────────────────────────────────────────────
const _fireCandleClose = (candle, token, symbol, exchange, tf) => {
  const closed = { ...candle, token, symbol, exchange, timeframe: tf }
  onCandleCloseCallbacks.forEach(cb => {
    try { cb(closed) } catch (err) {
      console.error('[CandleBuilder] Callback error:', err.message)
    }
  })
}

// ─── Register a candle close callback ────────────────────────────────────────
const onCandleClose = (callback) => {
  onCandleCloseCallbacks.push(callback)
}

// ─── Get the latest (in-progress) candle for a token + timeframe ─────────────
const getLatestCandle = (token, tf) => {
  return candles[`${token}_${tf}`] || null
}

// ─── Get last N closed candles (from memory) ──────────────────────────────────
// For full history, use Angel One historical API
const getRecentCandles = (token, tf, count = 50) => {
  // In production you'd keep a rolling buffer per key
  // For now returns the current in-progress candle only
  const current = candles[`${token}_${tf}`]
  return current ? [current] : []
}

module.exports = { onTick, onCandleClose, getLatestCandle, getRecentCandles }
