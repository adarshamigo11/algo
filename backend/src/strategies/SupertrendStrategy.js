/**
 * SupertrendStrategy.js — Supertrend Indicator
 *
 * Logic:
 *   BUY  when price closes above the supertrend line (trend turns UP)
 *   SELL when price closes below the supertrend line (trend turns DOWN)
 *   Uses ATR for dynamic stop-loss
 *
 * Works for: Intraday (MIS), F&O (NRML)
 * Recommended timeframe: 5min / 15min
 */

const BaseStrategy = require('./BaseStrategy')

class SupertrendStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'Supertrend',
      symbol        : config.symbol        || 'NIFTY',
      exchange      : config.exchange      || 'NSE',
      orderType     : config.orderType     || 'MIS',
      qty           : config.qty           || 1,
      slPercent     : config.slPercent     || 0.4,
      targetPercent : config.targetPercent || 1.2,
      ...config,
    })

    this.period      = config.period     || 7
    this.multiplier  = config.multiplier || 3

    // Supertrend internal state
    this.prevUpperBand  = null
    this.prevLowerBand  = null
    this.prevTrend      = null   // 1 = UP, -1 = DOWN
    this.lastSignal     = null
  }

  evaluate(candle) {
    if (this.candles.length < this.period + 2) return null

    const candles     = this.candles
    const atrVal      = this.atr(candles, this.period)
    if (!atrVal) return null

    const last        = candles[candles.length - 1]
    const hl2         = (last.high + last.low) / 2

    // Raw bands
    let upperBand     = hl2 + this.multiplier * atrVal
    let lowerBand     = hl2 - this.multiplier * atrVal

    // Adjust bands to prevent widening (standard supertrend logic)
    if (this.prevUpperBand !== null) {
      upperBand = (upperBand < this.prevUpperBand || candles[candles.length - 2].close > this.prevUpperBand)
        ? upperBand : this.prevUpperBand
      lowerBand = (lowerBand > this.prevLowerBand || candles[candles.length - 2].close < this.prevLowerBand)
        ? lowerBand : this.prevLowerBand
    }

    // Determine current trend
    let currTrend
    if (this.prevTrend === null) {
      currTrend = last.close > hl2 ? 1 : -1
    } else if (this.prevTrend === 1) {
      currTrend = last.close < lowerBand ? -1 : 1
    } else {
      currTrend = last.close > upperBand ?  1 : -1
    }

    let signal = null

    // Trend changed to UP → BUY
    if (this.prevTrend === -1 && currTrend === 1) {
      if (this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY',
          last.close,
          lowerBand,                        // use lower band as dynamic SL
          this.calcTarget(last.close, 'BUY'),
          `Supertrend flipped UP | ATR: ${atrVal.toFixed(2)} LowerBand: ${lowerBand.toFixed(2)}`
        )
        this.lastSignal = 'BUY'
      }
    }

    // Trend changed to DOWN → SELL
    if (this.prevTrend === 1 && currTrend === -1) {
      if (this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL',
          last.close,
          upperBand,                        // use upper band as dynamic SL
          this.calcTarget(last.close, 'SELL'),
          `Supertrend flipped DOWN | ATR: ${atrVal.toFixed(2)} UpperBand: ${upperBand.toFixed(2)}`
        )
        this.lastSignal = 'SELL'
      }
    }

    this.prevUpperBand = upperBand
    this.prevLowerBand = lowerBand
    this.prevTrend     = currTrend
    return signal
  }
}

module.exports = SupertrendStrategy
