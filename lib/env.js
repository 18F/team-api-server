'use strict'; // eslint-disable-line

// overrides process.env with values in local `.env` file, useful for development
require('dotenv').config({ silent: true });

const cfenv = require('cfenv');

const appEnv = cfenv.getAppEnv();

// default to using process.env to get config variables
let varSource = process.env;

if (!appEnv.isLocal) {
  // then we have a VCAP_SERVICES environment
  // so attempt to get service credentials
  const credentials = appEnv.getServiceCreds('team-api-server-env');
  if (credentials) {
    varSource = credentials;
  }
}

module.exports = {
  GITHUB_USER: varSource.GITHUB_USER,
  GITHUB_ACCESS_TOKEN: varSource.GITHUB_ACCESS_TOKEN, // with 'repo' scope
  GITHUB_ORG: varSource.GITHUB_ORG,
  DESTINATION_REPO: varSource.DESTINATION_REPO,
  DESTINATION_PATH: varSource.DESTINATION_PATH || '_data/projects',
  DESTINATION_BRANCH: varSource.DESTINATION_BRANCH || 'master',
  TARGET_FILE: varSource.TARGET_FILE || '.about.yml',
  PORT: varSource.PORT || appEnv.port || 6000, // port comes from the env, not as a credential
};
