const mongoose = require('mongoose')

const instrumentSchema = new mongoose.Schema({
  token:       { type: String, required: true }, // Angel One instrument token
  symbol:      { type: String, required: true },
  name:        { type: String },
  exchange:    { type: String, required: true }, // NSE, BSE, NFO, MCX, CDS
  segment:     { type: String },                 // EQ, FUT, CE, PE etc
  lotSize:     { type: Number, default: 1 },
  tickSize:    { type: Number, default: 0.05 },
  expiry:      { type: String, default: null },  // for F&O
  strikePrice: { type: Number, default: null },  // for options
  optionType:  { type: String, default: null },  // CE or PE
}, { timestamps: false })

// fast search by symbol and exchange
instrumentSchema.index({ symbol: 1, exchange: 1 })
instrumentSchema.index({ name: 'text', symbol: 'text' }) // text search

module.exports = mongoose.model('Instrument', instrumentSchema)
