/**
 * This is a small server that listens for push webhooks from GitHuh repos,
 * checks if a target YAML file (like `.about.yml`) has changed,
 * and, if so, uses the GitHub API to copy its contents to
 * a destination repo at a specified path, such as
 * `_data/projects/<project-name>.yml`.
 */

const githooked = require('githooked');
const yaml = require('js-yaml');
const winston = require('winston');

const env = require('./lib/env');
const GitHubFileCopier = require('./lib/GitHubFileCopier');

const logger = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({ timestamp: true }),
  ],
});

const fileCopier = new GitHubFileCopier({
  githubOrg: env.GITHUB_ORG,
  githubUser: env.GITHUB_USER,
  githubAccessToken: env.GITHUB_ACCESS_TOKEN,
  targetFile: env.TARGET_FILE,
  destinationRepo: env.DESTINATION_REPO,
  destinationPath: env.DESTINATION_PATH,
  destinationBranch: env.DESTINATION_BRANCH,
});

githooked('push', (payload) => {
  if (fileCopier.wasTargetUpdated(payload)) {
    logger.info(`Valid push hook received from ${payload.repository.full_name}`);

    fileCopier.getTarget(payload)
      .then((target) => {
        const buf = new Buffer(target.content, target.encoding);
        const contents = buf.toString();
        const jsonContents = yaml.load(contents);

        return fileCopier.putTarget(payload, target, `${jsonContents.name}.yml`)
          .then(() => {
            logger.info(`Successfully copied ${env.TARGET_FILE} to ${env.DESTINATION_REPO}`);
          });
      })
      .catch((err) => {
        logger.error(`Error copying ${env.TARGET_FILE} to ${env.DESTINATION_REPO}:`);
        logger.error(err);
      });
  }
}, {
  json: {
    limit: '5mb', // max Github webhook payload size, ref https://developer.github.com/webhooks/
  },
}).listen(env.PORT, () => {
  logger.info(`Listening for 'push' hooks on port ${env.PORT}`);
});
