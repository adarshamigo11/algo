const mongoose = require('mongoose')

const auditLogSchema = new mongoose.Schema({
  // who did the action
  actorId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  actorRole: { type: String, enum: ['admin', 'subadmin', 'user', 'system'], required: true },
  actorName: { type: String },

  // what happened
  action: { type: String, required: true },
  // examples: 'order_placed', 'order_rejected', 'user_created', 'strategy_assigned',
  //           'token_refreshed', 'risk_block', 'webhook_received', 'login'

  // extra detail
  targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  meta:         { type: mongoose.Schema.Types.Mixed, default: {} }, // any extra data

}, { timestamps: true })

module.exports = mongoose.model('AuditLog', auditLogSchema)
