const mongoose = require('mongoose')

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // broker details
  broker:      { type: String, enum: ['angelone', 'zerodha', 'upstox'], required: true },
  brokerOrderId: { type: String }, // id returned by broker after placement

  // order details
  symbol:    { type: String, required: true },
  exchange:  { type: String, required: true },    // NSE, BSE, NFO, MCX, CDS
  action:    { type: String, enum: ['BUY', 'SELL'], required: true },
  orderType: { type: String, enum: ['MARKET', 'LIMIT', 'SL', 'SL-M'], required: true },
  productType:{ type: String, enum: ['MIS', 'CNC', 'NRML'], required: true },
  qty:       { type: Number, required: true },
  price:     { type: Number, default: 0 },
  sl:        { type: Number, default: null },
  target:    { type: Number, default: null },

  // status
  status: {
    type: String,
    enum: ['pending', 'open', 'executed', 'rejected', 'cancelled'],
    default: 'pending',
  },
  fillPrice: { type: Number, default: null },

  // what triggered this order — stored internally for audit
  // user only sees 'algo' or 'manual'
  placedBy:     { type: String, enum: ['admin', 'subadmin', 'algo', 'user'], required: true },
  strategyName: { type: String, default: null },
  strategyId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Strategy', default: null },

  // label shown to user — always either 'algo' or 'manual'
  userLabel: { type: String, enum: ['algo', 'manual'], required: true },

  isPaper: { type: Boolean, default: false },
  reason:  { type: String, default: null }, // rejection reason or strategy signal reason

}, { timestamps: true })

module.exports = mongoose.model('Order', orderSchema)
