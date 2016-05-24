/*
 listens for webhooks from 18F repos,
    sees if their `.about.yml` has changed, and,
 if so, uses the GitHub API to copy its contents to
    `_data/projects/<project-name>.yml`
    in the 18F/https://github.com/18F/team-api.18f.gov repo

- update to node 5.x.x (whatever cloud.gov supports)
- config from environment variables
  - org to watch
  - destination repo
  - destination path in destination repo
  - port
- tests

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
}).listen(env.PORT, (s) => {
  logger.info(`Listening for 'push' hooks on port ${env.PORT}`);
});
