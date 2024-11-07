const config = {
  otcConfig: {
    orderValidTime: 10000,
    margin: 0.005,
    supportPairs: ['USDTSGD', 'USDTUSD'],
    decimal: {
      'USDTSGD': 4,
      'USDTUSD': 4
    },
    minQty: {
      'USDTSGD': 1,
      'USDTUSD': 1
    },
    coreURL: 'http://127.0.0.1:4523/m1/5204036-4870176-default',
    coinutUId: 1,
    otcNotificationWebhook: 'https://hooks.slack.com/services/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',
    otcEmailN8NWebhook: 'https://n8n.coinut.net/webhook/5ffcba80-3868-4a04-8603-e0f0c281cfcc'
  },
  coinutBankAccount: {
    USD: {
      beneficiaryName: 'COINUT PTE LTD',
      accountNo: '0729075441',
      bankName: 'DBS Bank',
    },
    SGD: {
      beneficiaryName: 'COINUT PTE LTD',
      accountNo: '0729075441',
      bankName: 'DBS Bank',
    }
  }
}
module.exports = config

