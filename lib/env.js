
require('dotenv').config();

module.exports = {
  GITHUB_USER: process.env.GITHUB_USER,
  GITHUB_ACCESS_TOKEN: process.env.GITHUB_ACCESS_TOKEN, // with 'repo' scope
  GITHUB_ORG: process.env.GITHUB_ORG,
  DESTINATION_REPO: process.env.DESTINATION_REPO,
  DESTINATION_PATH: process.env.DESTINATION_PATH,
  DESTINATION_BRANCH: process.env.DESTINATION_BRANCH || 'master',
  TARGET_FILE: process.env.TARGET_FILE || '.about.yml',
  PORT: process.env.PORT || 6000,
};
