const CryptoJS = require('crypto-js')

const KEY = process.env.ENCRYPTION_KEY

const encrypt = (text) => {
  if (!text) return null
  return CryptoJS.AES.encrypt(text, KEY).toString()
}

const decrypt = (cipherText) => {
  if (!cipherText) return null
  const bytes = CryptoJS.AES.decrypt(cipherText, KEY)
  return bytes.toString(CryptoJS.enc.Utf8)
}

module.exports = { encrypt, decrypt }
