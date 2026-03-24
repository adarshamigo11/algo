// Run this once to create the admin account:
// node src/scripts/seedAdmin.js

require('dotenv').config()
const mongoose = require('mongoose')
const Admin    = require('../models/Admin')

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI)
    console.log('Connected to MongoDB')

    const exists = await Admin.findOne({ email: 'admin@algotrade.com' })
    if (exists) {
      console.log('Admin already exists — nothing to do')
      process.exit(0)
    }

    await Admin.create({
      name:     'Admin',
      email:    'admin@algotrade.com',
      password: 'Admin@1234',  // CHANGE THIS immediately after first login
    })

    console.log('Admin created successfully')
    console.log('Email:    admin@algotrade.com')
    console.log('Password: Admin@1234')
    console.log('IMPORTANT: Change the password immediately after first login!')
    process.exit(0)

  } catch (err) {
    console.error('Seed failed:', err.message)
    process.exit(1)
  }
}

seedAdmin()
