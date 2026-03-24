/**
 * RSIStrategy.js — RSI Overbought / Oversold
 *
 * Logic:
 *   BUY  when RSI crosses UP through oversold level (default 30)
 *   SELL when RSI crosses DOWN through overbought level (default 70)
 *
 * Works for: Intraday (MIS), Swing (CNC)
 * Recommended timeframe: 15min (intraday), 1D (swing)
 */

const BaseStrategy = require('./BaseStrategy')

class RSIStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'RSI Overbought/Oversold',
      symbol        : config.symbol        || 'NIFTY',
      exchange      : config.exchange      || 'NSE',
      orderType     : config.orderType     || 'MIS',
      qty           : config.qty           || 1,
      slPercent     : config.slPercent     || 0.6,
      targetPercent : config.targetPercent || 1.2,
      ...config,
    })

    this.period       = config.period      || 14
    this.oversold     = config.oversold    || 30
    this.overbought   = config.overbought  || 70
    this.prevRSI      = null
    this.lastSignal   = null
  }

  evaluate(candle) {
    const closes = this.getCloses()
    if (closes.length < this.period + 2) return null

    const currRSI = this.rsi(closes, this.period)
    if (currRSI === null || this.prevRSI === null) {
      this.prevRSI = currRSI
      return null
    }

    let signal = null

    // RSI crosses UP through oversold → BUY (reversal from oversold)
    if (this.prevRSI <= this.oversold && currRSI > this.oversold) {
      if (this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY',
          candle.close,
          this.calcSL(candle.close, 'BUY'),
          this.calcTarget(candle.close, 'BUY'),
          `RSI crossed above oversold (${this.oversold}) | RSI: ${currRSI}`
        )
        this.lastSignal = 'BUY'
      }
    }

    // RSI crosses DOWN through overbought → SELL (reversal from overbought)
    if (this.prevRSI >= this.overbought && currRSI < this.overbought) {
      if (this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL',
          candle.close,
          this.calcSL(candle.close, 'SELL'),
          this.calcTarget(candle.close, 'SELL'),
          `RSI crossed below overbought (${this.overbought}) | RSI: ${currRSI}`
        )
        this.lastSignal = 'SELL'
      }
    }

    this.prevRSI = currRSI
    return signal
  }
}

module.exports = RSIStrategy

// ─── Usage Example ───────────────────────────────────────────────────────────
// const strategy = new RSIStrategy({
//   symbol      : 'BANKNIFTY',
//   exchange    : 'NSE',
//   orderType   : 'MIS',
//   qty         : 25,
//   period      : 14,
//   oversold    : 30,
//   overbought  : 70,
//   slPercent   : 0.6,
//   targetPercent: 1.2,
// })
