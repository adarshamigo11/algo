const express = require('express')
const router  = express.Router()
const StrategyAssignment = require('../../models/StrategyAssignment')
const { protect, allow } = require('../../middleware/auth')

router.use(protect)
router.use(allow('user'))

// ─── GET /api/user/strategies — get user's assigned strategies ────────────────
router.get('/', async (req, res) => {
  try {
    const assignments = await StrategyAssignment.find({
      userId: req.actor._id,
      isActive: true,
    }).populate('strategyId', 'name description defaultConfig')

    res.json(assignments)
  } catch (err) {
    console.error('Get strategies error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── PUT /api/user/strategies/:id — toggle paper/live mode ───────────────────
router.put('/:id', async (req, res) => {
  try {
    const { tradingMode } = req.body
    if (!['live', 'paper'].includes(tradingMode)) {
      return res.status(400).json({ message: 'tradingMode must be live or paper' })
    }

    const assignment = await StrategyAssignment.findOne({
      _id: req.params.id,
      userId: req.actor._id,
    })

    if (!assignment) return res.status(404).json({ message: 'Strategy not found' })

    assignment.tradingMode = tradingMode
    await assignment.save()

    res.json({ message: 'Mode updated' })
  } catch (err) {
    console.error('Update strategy error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
