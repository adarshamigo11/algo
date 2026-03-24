const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const subAdminSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, trim: true },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },

  // permissions — admin checks which ones to grant
  permissions: {
    manageUsers:       { type: Boolean, default: false },
    placeTrades:       { type: Boolean, default: false },
    viewPnL:           { type: Boolean, default: false },
    assignStrategies:  { type: Boolean, default: false },
    toggleAutomation:  { type: Boolean, default: false },
    viewTradeHistory:  { type: Boolean, default: false },
    manageBrokerKeys:  { type: Boolean, default: false },
    viewAuditLogs:     { type: Boolean, default: false },
  },

}, { timestamps: true })

subAdminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

subAdminSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password)
}

module.exports = mongoose.model('SubAdmin', subAdminSchema)
