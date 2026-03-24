const mongoose = require('mongoose')

const strategySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: [
      'EMA Crossover',
      'RSI Overbought/Oversold',
      'MACD Signal Cross',
      'Supertrend',
      'Bollinger Bands',
      'Opening Range Breakout',
    ],
  },

  // default config — can be overridden per user assignment
  defaultConfig: {
    symbol:        { type: String, default: 'NIFTY' },
    exchange:      { type: String, default: 'NSE' },
    orderType:     { type: String, default: 'MIS' },
    qty:           { type: Number, default: 1 },
    slPercent:     { type: Number, default: 0.5 },
    targetPercent: { type: Number, default: 1.0 },
    timeframe:     { type: String, default: '5min' },
  },

  description: { type: String },
  isActive:    { type: Boolean, default: true },

}, { timestamps: true })

module.exports = mongoose.model('Strategy', strategySchema)
