/**
 * EMAStrategy.js — EMA / SMA Crossover
 *
 * Logic:
 *   BUY  when fast EMA crosses ABOVE slow EMA
 *   SELL when fast EMA crosses BELOW slow EMA
 *
 * Works for: Intraday (MIS), Swing (CNC)
 * Recommended timeframe: 5min (intraday), 1D (swing)
 */

const BaseStrategy = require('./BaseStrategy')

class EMAStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'EMA Crossover',
      symbol        : config.symbol      || 'NIFTY',
      exchange      : config.exchange    || 'NSE',
      orderType     : config.orderType   || 'MIS',
      qty           : config.qty         || 1,
      slPercent     : config.slPercent   || 0.5,
      targetPercent : config.targetPercent || 1.0,
      ...config,
    })

    this.fastPeriod = config.fastPeriod || 9    // fast EMA period
    this.slowPeriod = config.slowPeriod || 21   // slow EMA period
    this.prevFast   = null
    this.prevSlow   = null
    this.lastSignal = null   // prevent duplicate signals
  }

  evaluate(candle) {
    const closes = this.getCloses()
    if (closes.length < this.slowPeriod + 1) return null

    const currFast = this.ema(closes, this.fastPeriod)
    const currSlow = this.ema(closes, this.slowPeriod)

    // Need at least 2 data points to detect crossover
    if (this.prevFast === null || this.prevSlow === null) {
      this.prevFast = currFast
      this.prevSlow = currSlow
      return null
    }

    let signal = null

    // Golden Cross — fast crosses above slow → BUY
    if (this.prevFast <= this.prevSlow && currFast > currSlow) {
      if (this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY',
          candle.close,
          this.calcSL(candle.close, 'BUY'),
          this.calcTarget(candle.close, 'BUY'),
          `EMA${this.fastPeriod} crossed above EMA${this.slowPeriod} | Fast: ${currFast.toFixed(2)} Slow: ${currSlow.toFixed(2)}`
        )
        this.lastSignal = 'BUY'
      }
    }

    // Death Cross — fast crosses below slow → SELL
    if (this.prevFast >= this.prevSlow && currFast < currSlow) {
      if (this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL',
          candle.close,
          this.calcSL(candle.close, 'SELL'),
          this.calcTarget(candle.close, 'SELL'),
          `EMA${this.fastPeriod} crossed below EMA${this.slowPeriod} | Fast: ${currFast.toFixed(2)} Slow: ${currSlow.toFixed(2)}`
        )
        this.lastSignal = 'SELL'
      }
    }

    this.prevFast = currFast
    this.prevSlow = currSlow
    return signal
  }
}

module.exports = EMAStrategy

// ─── Usage Example ───────────────────────────────────────────────────────────
// const strategy = new EMAStrategy({
//   symbol      : 'RELIANCE',
//   exchange    : 'NSE',
//   orderType   : 'MIS',
//   qty         : 10,
//   fastPeriod  : 9,
//   slowPeriod  : 21,
//   slPercent   : 0.5,
//   targetPercent: 1.0,
// })
// const signal = strategy.onCandle({ open, high, low, close, volume, timestamp })
