/**
 * Test script for locally sending a mock GitHub push webhook
 */

const rp = require('request-promise');

const env = require('../lib/env');

const payload = require('./push_payload.json');

rp.post({
  url: `http://localhost:${env.PORT}`,
  json: payload,
}).catch((err) => {
  console.error(`Error POSTing mock webhook: ${err}`);
});
