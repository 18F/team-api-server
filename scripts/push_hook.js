/**
 * Test script for locally sending a mock GitHub push webhook
 */

const crypto = require('crypto');

const rp = require('request-promise');
const env = require('../lib/env');

const payload = require('./push_payload.json');

const postOptions = {
  url: `http://localhost:${env.PORT}`,
  json: payload,
};

if (env.WEBHOOK_SECRET) {
  // If WEBHOOK_SECRET is present, then create a signature from it
  // and add it to the header of the mock push payload
  const signature = crypto.createHmac('sha1', env.WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest('hex');
  postOptions.headers = {
    'X-Hub-Signature': `sha1=${signature}`,
  };
}

rp.post(postOptions).catch((err) => {
  console.error(`Error POSTing mock webhook: ${err}`);
});
