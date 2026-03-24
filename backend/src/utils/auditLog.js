const AuditLog = require('../models/AuditLog')

const log = async ({ actorId, actorRole, actorName, action, targetUserId, meta }) => {
  try {
    await AuditLog.create({ actorId, actorRole, actorName, action, targetUserId, meta })
  } catch (err) {
    // audit log failure should never crash the main flow
    console.error('AuditLog write failed:', err.message)
  }
}

module.exports = { log }
