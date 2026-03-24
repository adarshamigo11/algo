const cron       = require('node-cron')
const axios      = require('axios')
const Instrument = require('../models/Instrument')

// Angel One instrument master URLs
const INSTRUMENT_URLS = {
  NSE: 'https://margincalculator.angelbroking.com/OpenAPI_File/files/OpenAPIScripMaster.json',
}

// ─── Download and upsert instruments into MongoDB ────────────────────────────
const downloadInstruments = async () => {
  console.log('[InstrumentDownload] Starting...')

  try {
    const res  = await axios.get(INSTRUMENT_URLS.NSE, { timeout: 30000 })
    const data = res.data

    if (!Array.isArray(data)) {
      throw new Error('Unexpected response format from Angel One instrument master')
    }

    // build bulk upsert operations
    const ops = data.map(item => ({
      updateOne: {
        filter: { token: String(item.token) },
        update: {
          $set: {
            token:       String(item.token),
            symbol:      item.symbol      || '',
            name:        item.name        || '',
            exchange:    item.exch_seg    || '',
            segment:     item.instrumenttype || '',
            lotSize:     Number(item.lotsize)    || 1,
            tickSize:    Number(item.tick_size)  || 0.05,
            expiry:      item.expiry      || null,
            strikePrice: item.strike ? Number(item.strike) / 100 : null,
            optionType:  item.optiontype  || null,
          },
        },
        upsert: true,
      },
    }))

    // process in batches of 1000 to avoid memory issues
    const BATCH = 1000
    let total = 0
    for (let i = 0; i < ops.length; i += BATCH) {
      await Instrument.bulkWrite(ops.slice(i, i + BATCH), { ordered: false })
      total += Math.min(BATCH, ops.length - i)
    }

    console.log(`[InstrumentDownload] Done — ${total} instruments upserted`)

  } catch (err) {
    console.error('[InstrumentDownload] Failed:', err.message)
  }
}

// ─── Schedule: 8:05 AM IST every weekday ─────────────────────────────────────
const startInstrumentDownloadCron = () => {
  cron.schedule('5 8 * * 1-5', downloadInstruments, {
    timezone: 'Asia/Kolkata',
  })

  console.log('[InstrumentDownload] Cron scheduled — 8:05 AM IST weekdays')
}

module.exports = { startInstrumentDownloadCron, downloadInstruments }
