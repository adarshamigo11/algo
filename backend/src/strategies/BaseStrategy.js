/**
 * BaseStrategy.js
 * Every strategy extends this class.
 * Provides shared utilities: SL/target calc, market hours, square-off, indicators.
 */

class BaseStrategy {
  constructor(config = {}) {
    this.name            = config.name            || 'BaseStrategy'
    this.symbol          = config.symbol          || 'NIFTY'
    this.exchange        = config.exchange        || 'NSE'       // NSE | BSE | NFO
    this.orderType       = config.orderType       || 'MIS'       // MIS | CNC | NRML
    this.qty             = config.qty             || 1
    this.slPercent       = config.slPercent       || 0.5         // stop-loss %
    this.targetPercent   = config.targetPercent   || 1.0         // target %
    this.squareOffTime   = config.squareOffTime   || '15:15'     // HH:MM IST
    this.candles         = []                                     // rolling OHLCV buffer
    this.position        = null                                   // { side, entryPrice, sl, target }
    this.enabled         = true
  }

  // ─── Main Entry Point ────────────────────────────────────────────────────

  /**
   * Called by strategyRunner on every closed candle.
   * candle = { open, high, low, close, volume, timestamp }
   */
  onCandle(candle) {
    this.candles.push(candle)
    if (this.candles.length > 500) this.candles.shift()

    if (!this.enabled)        return null
    if (!this.isMarketOpen()) return null
    if (this.shouldSquareOff()) {
      return this.buildSignal('SQUAREOFF', candle.close, null, null, 'Auto square-off time reached')
    }
    return this.evaluate(candle)
  }

  /** Each strategy MUST override this */
  evaluate(candle) {
    throw new Error(`${this.name}: evaluate() not implemented`)
  }

  // ─── Signal Builder ──────────────────────────────────────────────────────

  buildSignal(action, price, sl, target, reason = '') {
    return {
      strategyName : this.name,
      symbol       : this.symbol,
      exchange     : this.exchange,
      orderType    : this.orderType,
      action,                            // 'BUY' | 'SELL' | 'SQUAREOFF' | 'NONE'
      price        : parseFloat(price.toFixed(2)),
      qty          : this.qty,
      sl           : sl     ? parseFloat(sl.toFixed(2))     : null,
      target       : target ? parseFloat(target.toFixed(2)) : null,
      reason,
      triggeredAt  : new Date().toISOString(),
      placedBy     : 'algo',
    }
  }

  // ─── SL / Target ─────────────────────────────────────────────────────────

  calcSL(price, side) {
    const offset = price * (this.slPercent / 100)
    return side === 'BUY' ? price - offset : price + offset
  }

  calcTarget(price, side) {
    const offset = price * (this.targetPercent / 100)
    return side === 'BUY' ? price + offset : price - offset
  }

  // ─── Market Hours (IST) ──────────────────────────────────────────────────

  isMarketOpen() {
    const ist   = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const day   = ist.getDay()
    if (day === 0 || day === 6) return false
    const mins  = ist.getHours() * 60 + ist.getMinutes()
    return mins >= 555 && mins <= 915   // 9:15 AM – 3:15 PM
  }

  shouldSquareOff() {
    if (this.orderType !== 'MIS') return false
    const ist  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const [h, m] = this.squareOffTime.split(':').map(Number)
    return ist.getHours() === h && ist.getMinutes() >= m
  }

  // ─── Indicators ──────────────────────────────────────────────────────────

  getCloses() { return this.candles.map(c => c.close) }
  getHighs()  { return this.candles.map(c => c.high)  }
  getLows()   { return this.candles.map(c => c.low)   }

  sma(arr, period) {
    if (arr.length < period) return null
    const slice = arr.slice(-period)
    return slice.reduce((s, v) => s + v, 0) / period
  }

  ema(arr, period) {
    if (arr.length < period) return null
    const k = 2 / (period + 1)
    let val  = arr.slice(0, period).reduce((s, v) => s + v, 0) / period
    for (let i = period; i < arr.length; i++) val = arr[i] * k + val * (1 - k)
    return val
  }

  rsi(closes, period = 14) {
    if (closes.length < period + 1) return null
    const slice = closes.slice(-(period + 1))
    let gains = 0, losses = 0
    for (let i = 1; i < slice.length; i++) {
      const d = slice[i] - slice[i - 1]
      d > 0 ? (gains += d) : (losses += Math.abs(d))
    }
    const rs = (gains / period) / ((losses / period) || 1)
    return parseFloat((100 - 100 / (1 + rs)).toFixed(2))
  }

  macd(closes, fast = 12, slow = 26, signal = 9) {
    if (closes.length < slow + signal) return null
    const macdLine    = this.ema(closes, fast) - this.ema(closes, slow)
    // build macd history for signal line
    const macdHistory = []
    for (let i = slow; i <= closes.length; i++) {
      const sl = closes.slice(0, i)
      macdHistory.push(this.ema(sl, fast) - this.ema(sl, slow))
    }
    const signalLine  = this.ema(macdHistory, signal)
    const histogram   = macdLine - signalLine
    return { macdLine, signalLine, histogram }
  }

  bollingerBands(closes, period = 20, multiplier = 2) {
    if (closes.length < period) return null
    const slice  = closes.slice(-period)
    const middle = slice.reduce((s, v) => s + v, 0) / period
    const sd     = Math.sqrt(slice.reduce((s, v) => s + Math.pow(v - middle, 2), 0) / period)
    return {
      upper  : parseFloat((middle + multiplier * sd).toFixed(2)),
      middle : parseFloat(middle.toFixed(2)),
      lower  : parseFloat((middle - multiplier * sd).toFixed(2)),
    }
  }

  supertrend(candles, period = 7, multiplier = 3) {
    if (candles.length < period + 1) return null
    const atrVal = this.atr(candles, period)
    const last   = candles[candles.length - 1]
    const hl2    = (last.high + last.low) / 2
    const upperBand = hl2 + multiplier * atrVal
    const lowerBand = hl2 - multiplier * atrVal
    // simplified: compare close to bands
    const trend = last.close > upperBand ? 'UP' : last.close < lowerBand ? 'DOWN' : 'NEUTRAL'
    return { trend, upperBand, lowerBand, atr: atrVal }
  }

  atr(candles, period = 14) {
    if (candles.length < period + 1) return null
    const trs = []
    for (let i = 1; i < candles.length; i++) {
      const c = candles[i], p = candles[i - 1]
      trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)))
    }
    return trs.slice(-period).reduce((s, v) => s + v, 0) / period
  }

  stdDev(arr) {
    const mean = arr.reduce((s, v) => s + v, 0) / arr.length
    return Math.sqrt(arr.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / arr.length)
  }
}

module.exports = BaseStrategy
