const EMAStrategy         = require('../strategies/EMAStrategy')
const RSIStrategy         = require('../strategies/RSIStrategy')
const MACDStrategy        = require('../strategies/MACDStrategy')
const SupertrendStrategy  = require('../strategies/SupertrendStrategy')
const BollingerStrategy   = require('../strategies/BollingerStrategy')
const ORBStrategy         = require('../strategies/ORBStrategy')
const candleBuilder       = require('../marketdata/candleBuilder')
const StrategyAssignment  = require('../models/StrategyAssignment')
const Strategy            = require('../models/Strategy')

// maps strategy name (in DB) → class
const CLASS_MAP = {
  'EMA Crossover':          EMAStrategy,
  'RSI Overbought/Oversold':RSIStrategy,
  'MACD Signal Cross':      MACDStrategy,
  'Supertrend':             SupertrendStrategy,
  'Bollinger Bands':        BollingerStrategy,
  'Opening Range Breakout': ORBStrategy,
}

// loaded strategies: Map of assignmentId → { instance, userId, config }
const loaded = new Map()

let orderExecutor = null // set by init()
let running       = false

// ─── Init — called once from app.js ──────────────────────────────────────────
const init = async (executor) => {
  orderExecutor = executor

  // wire candle builder → this runner
  candleBuilder.onCandleClose(_onCandleClose)

  // load all active assignments from DB
  await loadAll()

  running = true
  console.log(`[StrategyRunner] Started — ${loaded.size} strategies loaded`)
}

// ─── Load all active strategy assignments from DB ─────────────────────────────
const loadAll = async () => {
  loaded.clear()

  const assignments = await StrategyAssignment.find({ isActive: true })
    .populate('strategyId')

  for (const a of assignments) {
    if (!a.strategyId) continue
    _loadOne(a)
  }
}

// ─── Load a single assignment ─────────────────────────────────────────────────
const _loadOne = (assignment) => {
  const stratName = assignment.strategyId.name
  const StratClass = CLASS_MAP[stratName]

  if (!StratClass) {
    console.warn(`[StrategyRunner] Unknown strategy: ${stratName}`)
    return
  }

  // merge strategy default config with assignment-level overrides
  const config = {
    ...assignment.strategyId.defaultConfig,
    ...assignment.config,
    name: stratName,
  }

  const instance = new StratClass(config)

  loaded.set(assignment._id.toString(), {
    instance,
    userId:      assignment.userId.toString(),
    tradingMode: assignment.tradingMode,
    config,
    strategyId:  assignment.strategyId._id.toString(),
    strategyName:stratName,
  })
}

// ─── Called on every closed candle ───────────────────────────────────────────
const _onCandleClose = async (candle) => {
  if (!running) return

  for (const [id, entry] of loaded) {
    const { instance, userId, tradingMode, strategyId, strategyName } = entry

    // only feed if symbol matches
    if (instance.symbol !== candle.symbol) continue
    // only feed if timeframe matches
    if (instance.timeframe && `${candle.timeframe}min` !== instance.timeframe &&
        candle.timeframe !== parseInt(instance.timeframe)) continue

    try {
      const signal = instance.onCandle(candle)

      if (signal && signal.action !== 'NONE' && signal.action !== 'SQUAREOFF') {
        console.log(`[StrategyRunner] ${strategyName} → ${signal.action} ${signal.symbol} for user ${userId}`)

        await orderExecutor.execute({
          ...signal,
          userId,
          strategyId,
          placedBy:    'algo',
          userLabel:   'algo',
          isPaper:     tradingMode === 'paper',
        })
      }

      // handle auto square-off signal
      if (signal && signal.action === 'SQUAREOFF') {
        await orderExecutor.squareOff({ userId, symbol: signal.symbol, isPaper: tradingMode === 'paper' })
      }

    } catch (err) {
      console.error(`[StrategyRunner] Error in ${strategyName} for user ${userId}:`, err.message)
    }
  }
}

// ─── Hot-reload a single assignment (call after admin assigns/removes) ────────
const reload = async (assignmentId) => {
  loaded.delete(assignmentId)
  const a = await StrategyAssignment.findById(assignmentId).populate('strategyId')
  if (a && a.isActive) _loadOne(a)
}

const stop  = () => { running = false }
const start = () => { running = true  }

const getStatus = () => ({
  running,
  count: loaded.size,
  strategies: Array.from(loaded.values()).map(e => ({
    name:   e.strategyName,
    symbol: e.config.symbol,
    userId: e.userId,
    mode:   e.tradingMode,
  })),
})

module.exports = { init, loadAll, reload, stop, start, getStatus }
