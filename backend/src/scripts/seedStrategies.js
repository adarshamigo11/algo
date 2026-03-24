// Run once to seed the strategy pool:
// node src/scripts/seedStrategies.js

require('dotenv').config()
const mongoose = require('mongoose')
const Strategy = require('../models/Strategy')

const strategies = [
  {
    name: 'EMA Crossover',
    description: 'Buys when fast EMA crosses above slow EMA. Sells on the reverse cross.',
    defaultConfig: { symbol: 'NIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.5, targetPercent: 1.0, timeframe: '5min' },
  },
  {
    name: 'RSI Overbought/Oversold',
    description: 'Buys when RSI crosses above 30 (oversold). Sells when RSI crosses below 70 (overbought).',
    defaultConfig: { symbol: 'NIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.6, targetPercent: 1.2, timeframe: '15min' },
  },
  {
    name: 'MACD Signal Cross',
    description: 'Buys on MACD bullish crossover with histogram confirmation. Sells on bearish cross.',
    defaultConfig: { symbol: 'NIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.5, targetPercent: 1.5, timeframe: '15min' },
  },
  {
    name: 'Supertrend',
    description: 'Buys when price closes above Supertrend line. Sells when it closes below.',
    defaultConfig: { symbol: 'BANKNIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.4, targetPercent: 1.2, timeframe: '5min' },
  },
  {
    name: 'Bollinger Bands',
    description: 'Breakout mode: buys on upper band breakout. Reversal mode: buys at lower band with RSI confirmation.',
    defaultConfig: { symbol: 'NIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.5, targetPercent: 1.0, timeframe: '15min' },
  },
  {
    name: 'Opening Range Breakout',
    description: 'Captures the 9:15–9:30 AM opening range. Buys on breakout above, sells on breakdown below.',
    defaultConfig: { symbol: 'NIFTY', exchange: 'NSE', orderType: 'MIS', qty: 1, slPercent: 0.3, targetPercent: 0.6, timeframe: '1min' },
  },
]

const seedStrategies = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    for (const s of strategies) {
      await Strategy.findOneAndUpdate(
        { name: s.name },
        s,
        { upsert: true, new: true }
      )
      console.log(`Seeded: ${s.name}`)
    }

    console.log('All 6 strategies seeded successfully')
    process.exit(0)

  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exit(1)
  }
}

seedStrategies()
