const knex = require('knex')({
  client: 'mysql',
  connection: {
    host: process.env.mysql_host,
    port: process.env.mysql_port,
    user: process.env.mysql_user,
    password: process.env.mysql_pass,
    database: process.env.mysql_db_name
  },
  pool: { min: 0, max: 4 }
})

module.exports = { knex }
