const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, trim: true },
  password: { type: String, required: true },

  // which subadmin manages this user
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'SubAdmin', default: null },

  // payment plan controls how many strategies they get
  plan: { type: String, enum: ['basic', 'standard', 'premium', 'custom'], default: 'basic' },

  // trading controls
  isActive:         { type: Boolean, default: true },
  automationEnabled:{ type: Boolean, default: false },
  tradingMode:      { type: String, enum: ['live', 'paper'], default: 'paper' },

  // risk limits — admin sets these
  riskParams: {
    maxPositionSize: { type: Number, default: 1 },
    dailyLossLimit:  { type: Number, default: 5000 },
    maxTradesPerDay: { type: Number, default: 10 },
  },

}, { timestamps: true })

// hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next()
  this.password = await bcrypt.hash(this.password, 10)
  next()
})

// compare password on login
userSchema.methods.matchPassword = async function (entered) {
  return bcrypt.compare(entered, this.password)
}

module.exports = mongoose.model('User', userSchema)
