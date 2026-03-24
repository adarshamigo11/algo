const express = require('express')
const router  = express.Router()

const Admin    = require('../models/Admin')
const SubAdmin = require('../models/SubAdmin')
const User     = require('../models/User')
const { generateToken } = require('../utils/jwt')
const { log } = require('../utils/auditLog')

// POST /api/auth/login
// Body: { email, password, role }  — role: 'admin' | 'subadmin' | 'user'
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'email, password and role are required' })
  }

  try {
    let account = null

    if (role === 'admin')    account = await Admin.findOne({ email })
    if (role === 'subadmin') account = await SubAdmin.findOne({ email })
    if (role === 'user')     account = await User.findOne({ email })

    if (!account) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // check if subadmin or user is active
    if (role !== 'admin' && account.isActive === false) {
      return res.status(403).json({ message: 'Account is suspended' })
    }

    const match = await account.matchPassword(password)
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = generateToken({ id: account._id, role })

    // write audit log
    await log({
      actorId:   account._id,
      actorRole: role,
      actorName: account.name,
      action:    'login',
      meta:      { email },
    })

    res.json({
      token,
      user: {
        id:   account._id,
        name: account.name,
        email:account.email,
        role,
        // include permissions for subadmin so frontend can show/hide features
        ...(role === 'subadmin' && { permissions: account.permissions }),
        // include plan for user
        ...(role === 'user' && { plan: account.plan, tradingMode: account.tradingMode }),
      },
    })

  } catch (err) {
    console.error('Login error:', err.message)
    res.status(500).json({ message: 'Server error' })
  }
})

module.exports = router
