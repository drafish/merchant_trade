const express = require('express')
const crypto = require('crypto')
const { coinutBankAccount } = require('../config')
const { knex } = require('../mysql')

const router = express.Router()

router.get('/bank-account', async (req, res) => {
  const { userId, currency, apiSecret } = req.query
  if (!currency) {
    return res.json({ status: 'params_missing' })
  }
  const account = coinutBankAccount[currency]
  if (!account) {
    return res.json({ status: 'unsupported_currency' })
  }

  const user = await knex.select(['account_no']).from('users').where({ id: userId }).first()
  const data = { ...account, transferReference: user.account_no.substr(3) }

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(JSON.stringify(data))
    .digest('hex')
  res.setHeader('X-SIGNATURE', signature)
  return res.json({ status: 'success', data })
})

router.get('/crypto-address', async (req, res) => {
  const { userId, currency, network, apiSecret } = req.query
  if (!currency) {
    return res.json({ status: 'params_missing' })
  }
  const account = await knex.select(['currency', 'address']).from('user_deposit_address').where({ user_id: userId, currency: network ? `${currency}_${network}` : currency }).first()
  if (!account) {
    return res.json({ status: 'unsupported_currency' })
  }
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(JSON.stringify(account))
    .digest('hex')
  res.setHeader('X-SIGNATURE', signature)
  return res.json({ status: 'success', data: account })
})

module.exports = {
  router,
}
