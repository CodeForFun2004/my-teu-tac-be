const { PayOS } = require('@payos/node');
const env = require('./env');

const payos = new PayOS({
  clientId: env.payos.clientId,
  apiKey: env.payos.apiKey,
  checksumKey: env.payos.checksumKey,
});

module.exports = payos;
