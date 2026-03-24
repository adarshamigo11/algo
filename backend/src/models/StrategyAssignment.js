const mongoose = require('mongoose')

// Links a user to a strategy with optional config overrides
const strategyAssignmentSchema = new mongoose.Schema({
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  strategyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Strategy', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, required: true }, // admin or subadmin id

  // override the strategy's default config for this user
  config: {
    symbol:        { type: String },
    exchange:      { type: String },
    orderType:     { type: String },
    qty:           { type: Number },
    slPercent:     { type: Number },
    targetPercent: { type: Number },
    timeframe:     { type: String },
  },

  isActive:    { type: Boolean, default: true },
  tradingMode: { type: String, enum: ['live', 'paper'], default: 'paper' },

}, { timestamps: true })

// a user can only be assigned the same strategy once
strategyAssignmentSchema.index({ userId: 1, strategyId: 1 }, { unique: true })

module.exports = mongoose.model('StrategyAssignment', strategyAssignmentSchema)
