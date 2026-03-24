const mongoose = require('mongoose')

const brokerAccountSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  broker: { type: String, enum: ['angelone', 'zerodha', 'upstox'], required: true },

  // credentials (stored encrypted — see utils/encrypt.js)
  clientId:       { type: String },
  encryptedApiKey:{ type: String },
  encryptedTotp:  { type: String },  // Angel One TOTP secret
  encryptedPin:   { type: String },  // Angel One MPIN

  // Zerodha / Upstox OAuth
  encryptedApiSecret: { type: String },

  // active session token (refreshed daily)
  encryptedAccessToken: { type: String },
  tokenExpiresAt:       { type: Date },

  isConnected: { type: Boolean, default: false },
  lastRefresh: { type: Date },

}, { timestamps: true })

// one broker account per user per broker
brokerAccountSchema.index({ userId: 1, broker: 1 }, { unique: true })

module.exports = mongoose.model('BrokerAccount', brokerAccountSchema)
