const crypto = require('crypto')

function generateAPIKeyAndSecretPair() {
  const apiKey = crypto.randomBytes(20).toString('hex')
  const apiSecret = crypto.randomBytes(40).toString('hex')

  return { apiKey, apiSecret }
}

const credentials = generateAPIKeyAndSecretPair()
console.log('API Key:', credentials.apiKey)
console.log('API Secret:', credentials.apiSecret)
