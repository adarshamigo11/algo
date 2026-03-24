/**
 * MACDStrategy.js — MACD Signal Line Cross
 *
 * Logic:
 *   BUY  when MACD line crosses ABOVE signal line (bullish crossover)
 *   SELL when MACD line crosses BELOW signal line (bearish crossover)
 *   Extra filter: only trade if histogram confirms direction
 *
 * Works for: Intraday (MIS), Swing (CNC)
 * Recommended timeframe: 15min (intraday), 1D (swing)
 */

const BaseStrategy = require('./BaseStrategy')

class MACDStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'MACD Signal Cross',
      symbol        : config.symbol        || 'NIFTY',
      exchange      : config.exchange      || 'NSE',
      orderType     : config.orderType     || 'MIS',
      qty           : config.qty           || 1,
      slPercent     : config.slPercent     || 0.5,
      targetPercent : config.targetPercent || 1.5,
      ...config,
    })

    this.fastPeriod   = config.fastPeriod   || 12
    this.slowPeriod   = config.slowPeriod   || 26
    this.signalPeriod = config.signalPeriod || 9
    this.prevMACD     = null
    this.prevSignal   = null
    this.lastSignal   = null
  }

  evaluate(candle) {
    const closes  = this.getCloses()
    const minBars = this.slowPeriod + this.signalPeriod + 2
    if (closes.length < minBars) return null

    const result = this.macd(closes, this.fastPeriod, this.slowPeriod, this.signalPeriod)
    if (!result) return null

    const { macdLine, signalLine, histogram } = result

    if (this.prevMACD === null || this.prevSignal === null) {
      this.prevMACD   = macdLine
      this.prevSignal = signalLine
      return null
    }

    let signal = null

    // Bullish crossover: MACD crosses above signal + histogram positive
    if (this.prevMACD <= this.prevSignal && macdLine > signalLine && histogram > 0) {
      if (this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY',
          candle.close,
          this.calcSL(candle.close, 'BUY'),
          this.calcTarget(candle.close, 'BUY'),
          `MACD crossed above signal | MACD: ${macdLine.toFixed(2)} Signal: ${signalLine.toFixed(2)} Hist: ${histogram.toFixed(2)}`
        )
        this.lastSignal = 'BUY'
      }
    }

    // Bearish crossover: MACD crosses below signal + histogram negative
    if (this.prevMACD >= this.prevSignal && macdLine < signalLine && histogram < 0) {
      if (this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL',
          candle.close,
          this.calcSL(candle.close, 'SELL'),
          this.calcTarget(candle.close, 'SELL'),
          `MACD crossed below signal | MACD: ${macdLine.toFixed(2)} Signal: ${signalLine.toFixed(2)} Hist: ${histogram.toFixed(2)}`
        )
        this.lastSignal = 'SELL'
      }
    }

    this.prevMACD   = macdLine
    this.prevSignal = signalLine
    return signal
  }
}

module.exports = MACDStrategy
