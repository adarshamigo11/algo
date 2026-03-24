/**
 * BollingerStrategy.js — Bollinger Bands Breakout / Mean Reversion
 *
 * Two modes (set via config.mode):
 *
 * 'BREAKOUT' (default for intraday/F&O):
 *   BUY  when price closes ABOVE upper band (momentum breakout)
 *   SELL when price closes BELOW lower band (momentum breakdown)
 *
 * 'REVERSAL' (for swing/range-bound markets):
 *   BUY  when price touches lower band + RSI < 35 (oversold reversal)
 *   SELL when price touches upper band + RSI > 65 (overbought reversal)
 *
 * Works for: Intraday (MIS), Swing (CNC), F&O (NRML)
 * Recommended timeframe: 15min (intraday), 1D (swing)
 */

const BaseStrategy = require('./BaseStrategy')

class BollingerStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'Bollinger Bands',
      symbol        : config.symbol        || 'NIFTY',
      exchange      : config.exchange      || 'NSE',
      orderType     : config.orderType     || 'MIS',
      qty           : config.qty           || 1,
      slPercent     : config.slPercent     || 0.5,
      targetPercent : config.targetPercent || 1.0,
      ...config,
    })

    this.bbPeriod    = config.bbPeriod    || 20
    this.bbMultiplier= config.bbMultiplier|| 2
    this.rsiPeriod   = config.rsiPeriod   || 14
    this.mode        = config.mode        || 'BREAKOUT'  // 'BREAKOUT' | 'REVERSAL'
    this.lastSignal  = null
  }

  evaluate(candle) {
    const closes = this.getCloses()
    if (closes.length < this.bbPeriod + 2) return null

    const bb  = this.bollingerBands(closes, this.bbPeriod, this.bbMultiplier)
    const rsi = this.rsi(closes, this.rsiPeriod)
    if (!bb) return null

    const price = candle.close
    let signal  = null

    if (this.mode === 'BREAKOUT') {
      // Price breaks above upper band → strong bullish momentum
      if (price > bb.upper && this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY', price,
          bb.middle,                        // middle band as SL
          this.calcTarget(price, 'BUY'),
          `BB Breakout UP | Price: ${price} > Upper: ${bb.upper} | Middle (SL): ${bb.middle}`
        )
        this.lastSignal = 'BUY'
      }
      // Price breaks below lower band → strong bearish momentum
      if (price < bb.lower && this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL', price,
          bb.middle,
          this.calcTarget(price, 'SELL'),
          `BB Breakdown | Price: ${price} < Lower: ${bb.lower} | Middle (SL): ${bb.middle}`
        )
        this.lastSignal = 'SELL'
      }
    }

    if (this.mode === 'REVERSAL') {
      // Price at lower band + RSI oversold → mean reversion BUY
      if (price <= bb.lower && rsi && rsi < 35 && this.lastSignal !== 'BUY') {
        signal = this.buildSignal(
          'BUY', price,
          this.calcSL(price, 'BUY'),
          bb.middle,                        // target = middle band (mean reversion)
          `BB Reversal BUY | Price at lower band: ${bb.lower} | RSI: ${rsi}`
        )
        this.lastSignal = 'BUY'
      }
      // Price at upper band + RSI overbought → mean reversion SELL
      if (price >= bb.upper && rsi && rsi > 65 && this.lastSignal !== 'SELL') {
        signal = this.buildSignal(
          'SELL', price,
          this.calcSL(price, 'SELL'),
          bb.middle,
          `BB Reversal SELL | Price at upper band: ${bb.upper} | RSI: ${rsi}`
        )
        this.lastSignal = 'SELL'
      }
    }

    // Reset signal when price returns to middle band
    if (price >= bb.middle - 2 && price <= bb.middle + 2) {
      this.lastSignal = null
    }

    return signal
  }
}

module.exports = BollingerStrategy
