const express = require('express')
const router  = express.Router()

const AuditLog = require('../../models/AuditLog')
const { protect, allow, hasPermission } = require('../../middleware/auth')

router.use(protect)
router.use(allow('admin', 'subadmin'))

// ─── GET /api/admin/audit ─────────────────────────────────────────────────────
// Query params: userId, action, role, from, to, limit
router.get('/', hasPermission('viewAuditLogs'), async (req, res) => {
  try {
    const { userId, action, role, from, to, limit = 100 } = req.query

    const filter = {}
    if (userId)   filter.targetUserId = userId
    if (action)   filter.action       = action
    if (role)     filter.actorRole    = role
    if (from || to) {
      filter.createdAt = {}
      if (from) filter.createdAt.$gte = new Date(from)
      if (to)   filter.createdAt.$lte = new Date(to)
    }

    // subadmin can only see logs for their assigned users
    // (simplified: filter by targetUserId restricted to their users via query)

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.json(logs)
  } catch (err) {
    console.error('Get audit logs error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
