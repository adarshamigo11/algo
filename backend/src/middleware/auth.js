const { verifyToken } = require('../utils/jwt')
const Admin    = require('../models/Admin')
const SubAdmin = require('../models/SubAdmin')
const User     = require('../models/User')

// Attaches req.actor = { id, role, ...doc } on every protected route
const protect = async (req, res, next) => {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' })
  }

  const token = header.split(' ')[1]

  try {
    const decoded = verifyToken(token)
    const { id, role } = decoded

    let actor = null
    if (role === 'admin')    actor = await Admin.findById(id).select('-password')
    if (role === 'subadmin') actor = await SubAdmin.findById(id).select('-password')
    if (role === 'user')     actor = await User.findById(id).select('-password')

    if (!actor) return res.status(401).json({ message: 'Account not found' })

    req.actor = actor
    req.actor.role = role
    next()

  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' })
  }
}

// Only allow specific roles
const allow = (...roles) => (req, res, next) => {
  if (!roles.includes(req.actor.role)) {
    return res.status(403).json({ message: 'Access denied' })
  }
  next()
}

// Check subadmin has a specific permission
const hasPermission = (permission) => (req, res, next) => {
  if (req.actor.role === 'admin') return next() // admin always passes
  if (req.actor.role === 'subadmin') {
    if (req.actor.permissions && req.actor.permissions[permission]) return next()
    return res.status(403).json({ message: `Permission denied: ${permission}` })
  }
  return res.status(403).json({ message: 'Access denied' })
}

module.exports = { protect, allow, hasPermission }
