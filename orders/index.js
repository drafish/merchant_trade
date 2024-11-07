const express = require('express')
const crypto = require('crypto')
const { otcConfig } = require('../config')
const { knex } = require('../mysql')

const router = express.Router()

router.post('/new', async (req, res) => {
  try {
    const { side, pair, quantity, userId, priceId, apiSecret, merchant_ref_id } = req.body
    if (!side || !pair || !quantity || !priceId || !merchant_ref_id) {
      return res.json({ status: 'params_missing' })
    }
    const oldOrder = await knex.select([
      'id', 'pair', 'side', 'quantity', 'status', 'price', 'merchant_ref_id', 'create_time'
    ]).from('hashnut_otc_orders').where({ merchant_ref_id }).first()
    if (oldOrder) {
      return res.json({ status: 'merchant_ref_id_exist' })
    }
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
    if (otcPrice.pair !== pair) {
      return res.json({ status: 'pair_not_match_price_id' })
    }
    const price = otcPrice[`${side.toLowerCase()}_price`]
    const amount = side === 'SELL' ? quantity : quantity / price
    if (Number(amount) < otcConfig.minQty[pair]) return { status: 'qty_too_small' }
    const now = Date.now()
    const order_id = crypto.randomUUID()
    await knex('hashnut_otc_orders').insert({
      id: order_id,
      merchant_ref_id,
      pair,
      side: side,
      user_id: userId,
      quantity,
      price_id: otcPrice.id,
      price,
      create_time: now,
    })
    const order = await knex.select([
      'id', 'pair', 'side', 'quantity', 'status', 'price', 'merchant_ref_id', 'create_time'
    ]).from('hashnut_otc_orders').where({ merchant_ref_id }).first()
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(JSON.stringify(order))
      .digest('hex')
    res.setHeader('X-SIGNATURE', signature)
    return res.json({ status: 'success', data: order })
  } catch (err) {
    console.error(err)
    return res.json({ status: 'system_error' })
  }
})

router.get('/query', async (req, res) => {
  const { merchant_ref_id, apiSecret } = req.query
  try {
    const order = await knex.select([
      'id', 'pair', 'side', 'quantity', 'status', 'price', 'merchant_ref_id', 'create_time'
    ]).from('hashnut_otc_orders').where({ merchant_ref_id }).first()
    if (!order) {
      return res.json({ status: 'order_not_exist' })
    }
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(JSON.stringify(order))
      .digest('hex')
    res.setHeader('X-SIGNATURE', signature)
    return res.json({ status: 'success', data: order })
  } catch (err) {
    console.error(err)
    return res.json({ status: 'system_error' })
  }
})

module.exports = {
  router,
}
