/**
 * strategies/index.js
 * Single import point for all strategies.
 */

const BaseStrategy        = require('./BaseStrategy')
const EMAStrategy         = require('./EMAStrategy')
const RSIStrategy         = require('./RSIStrategy')
const MACDStrategy        = require('./MACDStrategy')
const SupertrendStrategy  = require('./SupertrendStrategy')
const BollingerStrategy   = require('./BollingerStrategy')
const ORBStrategy         = require('./ORBStrategy')
const { StrategyRunner, STRATEGY_MAP } = require('./strategyRunner')

module.exports = {
  BaseStrategy,
  EMAStrategy,
  RSIStrategy,
  MACDStrategy,
  SupertrendStrategy,
  BollingerStrategy,
  ORBStrategy,
  StrategyRunner,
  STRATEGY_MAP,
}

/**
 * STRATEGY CATALOGUE
 * ─────────────────────────────────────────────────────────────────────────────
 * Name                      | Type          | Timeframe   | Mode
 * ─────────────────────────────────────────────────────────────────────────────
 * EMA Crossover             | Trend         | 5min / 1D   | MIS / CNC
 * RSI Overbought/Oversold   | Reversal      | 15min / 1D  | MIS / CNC
 * MACD Signal Cross         | Trend+Momentum| 15min / 1D  | MIS / CNC
 * Supertrend                | Trend         | 5min / 15min| MIS / NRML (F&O)
 * Bollinger Bands           | Breakout/Rev  | 15min / 1D  | MIS / CNC / NRML
 * Opening Range Breakout    | Breakout      | 1min        | MIS only
 * ─────────────────────────────────────────────────────────────────────────────
 */
