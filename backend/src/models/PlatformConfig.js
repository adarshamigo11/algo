const mongoose = require('mongoose')

// Stores platform-level config — admin's Angel One market data account
const platformConfigSchema = new mongoose.Schema({
  key:   { type: String, required: true, unique: true },
  value: { type: String, required: true }, // AES-256 encrypted
}, { timestamps: true })

module.exports = mongoose.model('PlatformConfig', platformConfigSchema)