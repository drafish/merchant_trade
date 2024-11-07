const express = require('express')
const axios = require('axios')
const crypto = require('crypto')
const { otcConfig } = require('../config')
const { knex } = require('../mysql')

const router = express.Router()

const sendNotificationViaWebhook = (title, params) => {
  let text = `:loudspeaker:\t\`${title}\``
  text += `\n*time:*\t\`${new Date().toUTCString()}\``
  Object.keys(params).forEach(k => {
    text += `\n*${k}:*`
    text += `\`\`\`${params[k]}\`\`\``
  })
  const options = {
    method: 'post',
    url: otcConfig.otcNotificationWebhook,
    data: { text }
  }
  axios(options).then(r => {
    console.log(r.data)
  }).catch(err => {
    console.log(err)
  })
}

router.get('/', async (req, res) => {
  const { pair, apiSecret } = req.query
  if (!pair) {
    return res.json({ status: 'params_missing' })
  }
  if (!otcConfig.supportPairs.includes(pair)) return res.json({ status: 'unsupported_pair' })
  try {
    const price = await knex.select(['id', 'pair', 'buy_price', 'sell_price', 'timestamp', 'expire_timestamp']).from('otc_pricing').where({ pair }).orderBy('expire_timestamp', 'desc').first()
    if (price) {
      if (price.expire_timestamp < Date.now()) {
        sendNotificationViaWebhook('Swap Pricing System Issue', { msg: 'Swap cannot quote latest price' })
        return res.json({ status: 'price_outdated' })
      }
      price.buy_price = (price.buy_price * (1 + otcConfig.margin)).toFixed(otcConfig.decimal[pair])
      price.sell_price = (price.sell_price * (1 - otcConfig.margin)).toFixed(otcConfig.decimal[pair])
      const signature = crypto
        .createHmac('sha256', apiSecret)
        .update(JSON.stringify(price))
        .digest('hex')
      res.setHeader('X-SIGNATURE', signature)
      return res.json({ status: 'success', data: price })
    } else {
      return res.json({ status: 'price_not_exist' })
    }
  } catch (err) {
    return res.json({ status: 'system_error' })
  }
})

module.exports = {
  router,
}
