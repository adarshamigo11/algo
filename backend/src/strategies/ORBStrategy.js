/**
 * ORBStrategy.js — Opening Range Breakout
 *
 * Logic:
 *   1. Capture the HIGH and LOW of the first N minutes after market open (9:15 AM)
 *      Default: first 15 minutes (9:15–9:30 AM) = "opening range"
 *   2. BUY  when price breaks ABOVE the opening range high
 *   3. SELL when price breaks BELOW the opening range low
 *   4. SL = opposite side of the opening range
 *   5. No new trades after 1:30 PM (risk management)
 *
 * Works for: Intraday ONLY (MIS) — resets every day
 * Recommended timeframe: 1min candles
 */

const BaseStrategy = require('./BaseStrategy')

class ORBStrategy extends BaseStrategy {
  constructor(config = {}) {
    super({
      name          : 'Opening Range Breakout',
      symbol        : config.symbol        || 'NIFTY',
      exchange      : config.exchange      || 'NSE',
      orderType     : 'MIS',              // ORB is always intraday
      qty           : config.qty           || 1,
      slPercent     : config.slPercent     || 0.3,
      targetPercent : config.targetPercent || 0.6,
      squareOffTime : config.squareOffTime || '15:15',
      ...config,
    })

    this.orbMinutes    = config.orbMinutes || 15     // opening range duration in minutes
    this.noTradeAfter  = config.noTradeAfter || '13:30'  // stop new entries after this time
    this.orbHigh       = null
    this.orbLow        = null
    this.orbComplete   = false
    this.orbCandles    = []
    this.lastSignal    = null
    this.lastTradeDate = null
  }

  evaluate(candle) {
    const ist         = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
    const dateStr     = ist.toDateString()
    const totalMins   = ist.getHours() * 60 + ist.getMinutes()
    const marketOpen  = 9 * 60 + 15    // 9:15 AM
    const orbEnd      = marketOpen + this.orbMinutes
    const [noH, noM]  = this.noTradeAfter.split(':').map(Number)
    const noTradeMin  = noH * 60 + noM

    // Reset every new trading day
    if (this.lastTradeDate !== dateStr) {
      this.orbHigh      = null
      this.orbLow       = null
      this.orbComplete  = false
      this.orbCandles   = []
      this.lastSignal   = null
      this.lastTradeDate= dateStr
    }

    // Phase 1: Build opening range (first N minutes)
    if (totalMins >= marketOpen && totalMins < orbEnd) {
      this.orbCandles.push(candle)
      this.orbHigh = Math.max(...this.orbCandles.map(c => c.high))
      this.orbLow  = Math.min(...this.orbCandles.map(c => c.low))
      return null   // still building range, no signals yet
    }

    // Mark ORB as complete once we pass the ORB window
    if (totalMins >= orbEnd && !this.orbComplete && this.orbCandles.length > 0) {
      this.orbComplete = true
      console.log(`[ORB] ${this.symbol} Opening Range: High=${this.orbHigh} Low=${this.orbLow}`)
    }

    if (!this.orbComplete) return null

    // No new trades after noTradeAfter time
    if (totalMins >= noTradeMin) return null

    const price  = candle.close
    const range  = this.orbHigh - this.orbLow
    let signal   = null

    // Breakout ABOVE opening range high → BUY
    if (price > this.orbHigh && this.lastSignal !== 'BUY') {
      const sl     = this.orbLow                          // SL = ORB low
      const target = price + range                        // target = 1:1 RR of range
      signal = this.buildSignal(
        'BUY', price, sl, target,
        `ORB Breakout UP | Range High: ${this.orbHigh} Range Low: ${this.orbLow} Range: ${range.toFixed(2)}`
      )
      this.lastSignal = 'BUY'
    }

    // Breakdown BELOW opening range low → SELL
    if (price < this.orbLow && this.lastSignal !== 'SELL') {
      const sl     = this.orbHigh                         // SL = ORB high
      const target = price - range                        // target = 1:1 RR of range
      signal = this.buildSignal(
        'SELL', price, sl, target,
        `ORB Breakdown | Range High: ${this.orbHigh} Range Low: ${this.orbLow} Range: ${range.toFixed(2)}`
      )
      this.lastSignal = 'SELL'
    }

    return signal
  }

  // ORB exposes range info for UI display
  getRangeInfo() {
    return {
      orbHigh    : this.orbHigh,
      orbLow     : this.orbLow,
      orbComplete: this.orbComplete,
      orbMinutes : this.orbMinutes,
    }
  }
}

module.exports = ORBStrategy
