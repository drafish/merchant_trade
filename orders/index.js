const express = require('express')
const axios = require('axios')
const crypto = require('crypto')
const { otcConfig, coinutBankAccount } = require('../config')
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

router.post('/new', async (req, res) => {
  try {
    const { side, pair, quantity, clientOrderId, userId, priceId } = req.body
    if (isNaN(quantity) || Number(quantity) <= 0) {
      return res.json({ status: 'paramter_format_error' })
    }
    const otcPrice = await knex.select().from('otc_pricing').where({ id: priceId }).first()
    if (!otcPrice) {
      return res.json({ status: 'price_id_not_exist' })
    }
    if (otcPrice.expire_timestamp < Date.now()) {
      return res.json({ status: 'price_outdated' })
    }
    const price = otcPrice[`${side.toLowerCase()}_price`]
    const amount = side === 'SELL' ? quantity : quantity / price
    if (Number(amount) < otcConfig.minQty[pair]) return { status: 'qty_too_small' }
    const now = Date.now()
    const order_id = crypto.randomUUID()
    await knex('hashnut_otc_orders').insert({
      id: order_id,
      client_order_id: clientOrderId,
      pair,
      side: side,
      user_id: userId,
      quantity,
      price_id: otcPrice.id,
      price,
      create_time: now,
      expire_time: now + otcConfig.orderValidTime
    })
    const order = await knex.select([
      'id', 'pair', 'side', 'quantity', 'price_id', 'expire_time', 'status', 'client_order_id', 'price'
    ]).from('hashnut_otc_orders').where({ id: order.order_id }).first()
    return res.json({ status: 'success', data: order })
  } catch (err) {
    console.error(err)
    return res.json({ status: 'system_error' })
  }
})

router.get('/query', async (req, res) => {
  const { id } = req.query
  try {
    const order = await knex.select([
      'id', 'pair', 'side', 'quantity', 'price_id', 'expire_time', 'status', 'client_order_id', 'price'
    ]).from('hashnut_otc_orders').where({ id }).first()
    return res.json({ status: 'success', data: order })
  } catch (err) {
    console.error(err)
    return res.json({ status: 'system_error' })
  }
})

router.get('/check-price', async (req, res) => {
  const { pair } = req.query
  if (!otcConfig.supportPairs.includes(pair)) return res.json({ status: 'unsupported_pair' })
  try {
    const price = await knex.select().from('otc_pricing').where({ pair }).orderBy('expire_timestamp', 'desc').first()
    if (price) {
      console.log(price.expire_timestamp, Date.now())
      if (price.expire_timestamp < Date.now()) {
        sendNotificationViaWebhook('Swap Pricing System Issue', { msg: 'Swap cannot quote latest price' })
        return res.json({ status: 'price_outdated' })
      }
      price.buy_price = (price.buy_price * (1 + otcConfig.margin)).toFixed(otcConfig.decimal[pair])
      price.sell_price = (price.sell_price * (1 - otcConfig.margin)).toFixed(otcConfig.decimal[pair])
      return res.json({ status: 'success', data: price })
    } else {
      return res.json({ status: 'system_error' })
    }
  } catch (err) {
    return res.json({ status: 'system_error' })
  }
})

router.get('/funding-info', async (req, res) => {
  const { userId, currency } = req.query
  if (currency === 'USDT') {
    const depositAddress = await knex.select().from('user_deposit_address').where({ user_id: userId, currency: `${currency}_ERC20` }).first()
    return res.json({ status: 'success', data: depositAddress })
  } else {
    const user = await knex.select(['account_no']).from('users').where({ id: userId }).first()
    return res.json({ status: 'success', data: { ...coinutBankAccount, transferPS: user.account_no.substr(3) } })
  }
})

module.exports = {
  router,
}
