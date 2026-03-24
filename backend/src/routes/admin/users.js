const express = require('express')
const router  = express.Router()

const User     = require('../../models/User')
const { protect, allow, hasPermission } = require('../../middleware/auth')
const { log }  = require('../../utils/auditLog')

// All routes below require login + admin or subadmin with manageUsers permission
router.use(protect)
router.use(allow('admin', 'subadmin'))

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// Admin sees all users. SubAdmin sees only their assigned users.
router.get('/', async (req, res) => {
  try {
    let query = {}

    if (req.actor.role === 'subadmin') {
      query.assignedTo = req.actor._id
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })

    res.json(users)

  } catch (err) {
    console.error('Get users error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── GET /api/admin/users/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password')
    if (!user) return res.status(404).json({ message: 'User not found' })

    // subadmin can only view their own assigned users
    if (req.actor.role === 'subadmin' &&
        String(user.assignedTo) !== String(req.actor._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    res.json(user)

  } catch (err) {
    console.error('Get user error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/users ────────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, password, plan } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required' })
  }

  try {
    const exists = await User.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already registered' })

    const user = await User.create({
      name, email, phone,
      password,
      plan: plan || 'basic',
      // if a subadmin creates the user, auto-assign to them
      assignedTo: req.actor.role === 'subadmin' ? req.actor._id : null,
    })

    await log({
      actorId:      req.actor._id,
      actorRole:    req.actor.role,
      actorName:    req.actor.name,
      action:       'user_created',
      targetUserId: user._id,
      meta:         { email, plan },
    })

    res.status(201).json({ message: 'User created', userId: user._id })

  } catch (err) {
    console.error('Create user error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── PUT /api/admin/users/:id ─────────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const allowed = ['name', 'phone', 'plan', 'isActive', 'automationEnabled',
                   'tradingMode', 'riskParams', 'assignedTo']

  try {
    const user = await User.findById(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    // subadmin can only edit their assigned users
    if (req.actor.role === 'subadmin' &&
        String(user.assignedTo) !== String(req.actor._id)) {
      return res.status(403).json({ message: 'Access denied' })
    }

    allowed.forEach(field => {
      if (req.body[field] !== undefined) user[field] = req.body[field]
    })

    // handle password reset separately
    if (req.body.password) {
      user.password = req.body.password // pre-save hook will hash it
    }

    await user.save()

    await log({
      actorId:      req.actor._id,
      actorRole:    req.actor.role,
      actorName:    req.actor.name,
      action:       'user_updated',
      targetUserId: user._id,
      meta:         { fields: Object.keys(req.body) },
    })

    res.json({ message: 'User updated' })

  } catch (err) {
    console.error('Update user error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── DELETE /api/admin/users/:id — admin only ─────────────────────────────────
router.delete('/:id', allow('admin'), async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id)
    if (!user) return res.status(404).json({ message: 'User not found' })

    await log({
      actorId:      req.actor._id,
      actorRole:    req.actor.role,
      actorName:    req.actor.name,
      action:       'user_deleted',
      targetUserId: req.params.id,
      meta:         { email: user.email },
    })

    res.json({ message: 'User deleted' })

  } catch (err) {
    console.error('Delete user error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
