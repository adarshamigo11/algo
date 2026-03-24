const express = require('express')
const router  = express.Router()

const Instrument = require('../models/Instrument')
const { protect } = require('../middleware/auth')

router.use(protect)

// ─── GET /api/instruments/search?q=NIFTY&exchange=NFO&limit=20 ────────────────
router.get('/search', async (req, res) => {
  const { q, exchange, segment, limit = 20 } = req.query

  if (!q || q.trim().length < 1) {
    return res.status(400).json({ message: 'Search query q is required' })
  }

  try {
    const filter = {
      $or: [
        { symbol: { $regex: q.trim(), $options: 'i' } },
        { name:   { $regex: q.trim(), $options: 'i' } },
      ],
    }

    if (exchange) filter.exchange = exchange.toUpperCase()
    if (segment)  filter.segment  = segment.toUpperCase()

    const instruments = await Instrument.find(filter)
      .limit(Number(limit))
      .select('token symbol name exchange segment lotSize tickSize expiry strikePrice optionType')

    res.json(instruments)
  } catch (err) {
    console.error('Instrument search error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET /api/instruments/:token — get single instrument by token ─────────────
router.get('/:token', async (req, res) => {
  try {
    const instrument = await Instrument.findOne({ token: req.params.token })
    if (!instrument) return res.status(404).json({ message: 'Instrument not found' })
    res.json(instrument)
  } catch (err) {
    console.error('Get instrument error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
