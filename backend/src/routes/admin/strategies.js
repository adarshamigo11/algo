const express = require('express')
const router  = express.Router()

const Strategy           = require('../../models/Strategy')
const StrategyAssignment = require('../../models/StrategyAssignment')
const { protect, allow, hasPermission } = require('../../middleware/auth')
const { log } = require('../../utils/auditLog')

router.use(protect)
router.use(allow('admin', 'subadmin'))

// ─── GET /api/admin/strategies — list all strategies in the pool ──────────────
router.get('/', async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ name: 1 })
    res.json(strategies)
  } catch (err) {
    console.error('Get strategies error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/strategies — add a strategy to pool (admin only) ─────────
router.post('/', allow('admin'), async (req, res) => {
  const { name, description, defaultConfig } = req.body
  if (!name) return res.status(400).json({ message: 'name is required' })

  try {
    const exists = await Strategy.findOne({ name })
    if (exists) return res.status(400).json({ message: 'Strategy already exists' })

    const strategy = await Strategy.create({ name, description, defaultConfig })

    await log({
      actorId: req.actor._id, actorRole: 'admin', actorName: req.actor.name,
      action: 'strategy_created', meta: { name },
    })

    res.status(201).json({ message: 'Strategy created', strategyId: strategy._id })
  } catch (err) {
    console.error('Create strategy error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/strategies/assign — assign strategy to a user ────────────
router.post('/assign', hasPermission('assignStrategies'), async (req, res) => {
  const { userId, strategyId, config } = req.body
  if (!userId || !strategyId) {
    return res.status(400).json({ message: 'userId and strategyId are required' })
  }

  try {
    const strategy = await Strategy.findById(strategyId)
    if (!strategy) return res.status(404).json({ message: 'Strategy not found' })

    // upsert — if already assigned, update config
    await StrategyAssignment.findOneAndUpdate(
      { userId, strategyId },
      { userId, strategyId, assignedBy: req.actor._id, config: config || {}, isActive: true },
      { upsert: true, new: true }
    )

    await log({
      actorId: req.actor._id, actorRole: req.actor.role, actorName: req.actor.name,
      action: 'strategy_assigned', targetUserId: userId,
      meta: { strategyId, strategyName: strategy.name },
    })

    res.json({ message: `${strategy.name} assigned to user` })
  } catch (err) {
    console.error('Assign strategy error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── DELETE /api/admin/strategies/assign — remove strategy from user ──────────
router.delete('/assign', hasPermission('assignStrategies'), async (req, res) => {
  const { userId, strategyId } = req.body
  if (!userId || !strategyId) {
    return res.status(400).json({ message: 'userId and strategyId are required' })
  }

  try {
    await StrategyAssignment.findOneAndDelete({ userId, strategyId })

    await log({
      actorId: req.actor._id, actorRole: req.actor.role, actorName: req.actor.name,
      action: 'strategy_unassigned', targetUserId: userId, meta: { strategyId },
    })

    res.json({ message: 'Strategy removed from user' })
  } catch (err) {
    console.error('Unassign strategy error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET /api/admin/strategies/user/:userId — get strategies for a user ───────
router.get('/user/:userId', async (req, res) => {
  try {
    const assignments = await StrategyAssignment.find({ userId: req.params.userId })
      .populate('strategyId', 'name description defaultConfig')
    res.json(assignments)
  } catch (err) {
    console.error('Get user strategies error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
