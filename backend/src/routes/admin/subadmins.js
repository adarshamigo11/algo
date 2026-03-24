const express = require('express')
const router  = express.Router()

const SubAdmin = require('../../models/SubAdmin')
const { protect, allow } = require('../../middleware/auth')
const { log } = require('../../utils/auditLog')

// All routes — admin only
router.use(protect)
router.use(allow('admin'))

// ─── GET /api/admin/subadmins ─────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const subadmins = await SubAdmin.find().select('-password').sort({ createdAt: -1 })
    res.json(subadmins)
  } catch (err) {
    console.error('Get subadmins error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── POST /api/admin/subadmins ────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { name, email, phone, password, permissions } = req.body

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'name, email, and password are required' })
  }

  try {
    const exists = await SubAdmin.findOne({ email })
    if (exists) return res.status(400).json({ message: 'Email already registered' })

    const subadmin = await SubAdmin.create({
      name, email, phone, password,
      permissions: permissions || {},
    })

    await log({
      actorId:   req.actor._id,
      actorRole: 'admin',
      actorName: req.actor.name,
      action:    'subadmin_created',
      meta:      { email, permissions },
    })

    res.status(201).json({ message: 'SubAdmin created', subAdminId: subadmin._id })

  } catch (err) {
    console.error('Create subadmin error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── PUT /api/admin/subadmins/:id ─────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const allowed = ['name', 'phone', 'isActive', 'permissions']

  try {
    const subadmin = await SubAdmin.findById(req.params.id)
    if (!subadmin) return res.status(404).json({ message: 'SubAdmin not found' })

    allowed.forEach(field => {
      if (req.body[field] !== undefined) subadmin[field] = req.body[field]
    })

    if (req.body.password) subadmin.password = req.body.password

    await subadmin.save()

    await log({
      actorId:   req.actor._id,
      actorRole: 'admin',
      actorName: req.actor.name,
      action:    'subadmin_updated',
      meta:      { subAdminId: req.params.id, fields: Object.keys(req.body) },
    })

    res.json({ message: 'SubAdmin updated' })

  } catch (err) {
    console.error('Update subadmin error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

// ─── DELETE /api/admin/subadmins/:id ─────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const subadmin = await SubAdmin.findByIdAndDelete(req.params.id)
    if (!subadmin) return res.status(404).json({ message: 'SubAdmin not found' })

    await log({
      actorId:   req.actor._id,
      actorRole: 'admin',
      actorName: req.actor.name,
      action:    'subadmin_deleted',
      meta:      { email: subadmin.email },
    })

    res.json({ message: 'SubAdmin deleted' })

  } catch (err) {
    console.error('Delete subadmin error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
