const express = require('express')
const morgan = require('morgan')
const bodyParser = require('body-parser')
const crypto = require('crypto')
const { knex } = require('./mysql')
const orders = require('./orders')
const price = require('./price')
const deposit = require('./deposit')

const app = express()

const checkAPIKey = async (apiKey) => {
  try {
    const merchant = await knex('hashnut_merchants').select(['user_id', 'api_secret']).where({ api_key: apiKey }).first()
    if (merchant) {
      return merchant
    }
    return ''
  } catch (err) {
    console.error(err)
    return ''
  }
}

app.use(morgan('combined'))
app.use(bodyParser.urlencoded({ type: 'application/x-www-form-urlencoded', extended: true }))
app.use(bodyParser.json())

app.use(async (req, res, next) => {
  const clientApiKey = req.header('X-API-KEY')
  const clientSignature = req.header('X-SIGNATURE')
  if (!clientSignature) {
    return res.status(400).send('Signature missing')
  }
  if (!clientApiKey) {
    return res.status(400).send('Api Key missing')
  }
  const { user_id: userId, api_secret: apiSecret } = await checkAPIKey(clientApiKey)
  if (!apiSecret) {
    return res.status(400).send('Cannot find the user')
  }
  let dataToSign
  if (req.method === 'POST') {
    dataToSign = JSON.stringify(req.body)
    req.body.userId = userId
    req.body.apiSecret = apiSecret
  } else if (req.method === 'GET') {
    dataToSign = req.originalUrl
    req.query.userId = userId
    req.query.apiSecret = apiSecret
  } else {
    return res.status(405).send('Method not allowed')
  }
  const expectedSignature = crypto
    .createHmac('sha256', apiSecret)
    .update(dataToSign)
    .digest('hex')
  if (clientSignature !== expectedSignature) {
    return res.status(401).send('Invalid signature')
  }
  next()
})

app.use('/order', orders.router)
app.use('/price', price.router)
app.use('/deposit', deposit.router)

app.use('*', (err, req, res, next) => {
  if (err) next(err)
  res.status(500).end()
})

app.listen(process.env.PORT || 8089, () => {
  console.log(`Server is listening at http://localhost:${process.env.PORT || 8089}`)
})
