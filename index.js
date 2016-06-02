/**
 * This is a small server that listens for push webhooks from GitHub repos,
 * checks if a target YAML file (like `.about.yml`) has changed,
 * and, if so, uses the GitHub API to copy its contents to
 * a destination repo at a specified path, such as
 * `_data/projects/<project-name>.yml`.
 */

const env = require('./lib/env');
const logger = require('./lib/logger');

if (env.NEW_RELIC_LICENSE_KEY && env.NEW_RELIC_APP_NAME) {
  logger.info(`Enabling New Relic monitoring for app name "${env.NEW_RELIC_APP_NAME}"`);
  require('newrelic'); // eslint-disable-line global-require
}

const githooked = require('githooked');
const yaml = require('js-yaml');
const express = require('express');

const GitHubFileCopier = require('./lib/GitHubFileCopier');

const fileCopier = new GitHubFileCopier({
  githubOrg: env.GITHUB_ORG,
  githubUser: env.GITHUB_USER,
  githubAccessToken: env.GITHUB_ACCESS_TOKEN,
  targetFile: env.TARGET_FILE,
  destinationRepo: env.DESTINATION_REPO,
  destinationPath: env.DESTINATION_PATH,
  destinationBranch: env.DESTINATION_BRANCH,
});

function handlePush(payload) {
  if (fileCopier.wasTargetUpdated(payload)) {
    logger.info(`Valid push hook received from ${payload.repository.full_name}`);

    fileCopier.getTargetContents(payload)
      .then((target) => {
        if (!target) {
          throw new Error('target file not found');
        }

        const buf = new Buffer(target.content, target.encoding);
        const contents = buf.toString();
        const jsonContents = yaml.load(contents);
        const name = `${jsonContents.name}.yml`;
        return fileCopier.putTarget(payload, target, name)
          .then(() => {
            logger.info(`Successfully copied ${env.TARGET_FILE}`
              + ` from ${payload.repository.full_name}`
              + ` to ${env.DESTINATION_REPO}/${env.DESTINATION_PATH}/${name}`
            );
          });
      })
      .catch((err) => {
        logger.error(`Error copying ${env.TARGET_FILE} to ${env.DESTINATION_REPO}:`);
        logger.error(err);
      });
  }
}

const app = express();

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});

app.get('/ping', (req, res) => {
  res.send('ok');
});

// setup githooked with json limit of 5mb, the max Github webhook payload size
// ref https://developer.github.com/webhooks/
const hookOptions = {
  json: { limit: '5mb' },
};

// if WEBHOOK_SECRET has been specified add it as a config param
// to githooked options
if (env.WEBHOOK_SECRET) {
  hookOptions.secret = env.WEBHOOK_SECRET;
} else {
  logger.info('WEBHOOK_SECRET not provided. Specify WEBHOOK_SECRET for increased security.');
}

const pushHook = githooked('push', handlePush, hookOptions);
pushHook.on('error', (err) => {
  logger.error(err.toString());
});

app.use('/', pushHook);

if (require.main === module) {
  app.listen(env.PORT, () => {
    logger.info(`team-api-server started on port ${env.PORT}`);
  });
}

module.exports = app;
