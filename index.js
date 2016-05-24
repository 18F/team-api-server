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

const env = require('./lib/env');
const GitHubFileCopier = require('./lib/GitHubFileCopier');

const fileCopier = new GitHubFileCopier({
  githubOrg: env.GITHUB_ORG,
  targetFile: env.TARGET_FILE,
  destinationRepo: env.DESTINATION_REPO,
  destinationPath: env.DESTINATION_PATH,
});

githooked('push', (payload) => {
  console.log('received the push event');

  if (fileCopier.wasTargetUpdated(payload)) {
    fileCopier.getTarget(payload)
      .then((result) => {
        const buf = new Buffer(result.content, result.encoding);
        const contents = buf.toString();
        const jsonContents = yaml.load(contents);
        fileCopier.putTarget(payload, `${jsonContents.name}.yml`)
          .then(() => {

          })
      });
  }

  // const commit = util.getTargetModifiedCommit(payload);
  // if (commit) {
  //   console.log(`  -- "${env.TARGET_FILE}" has been modified in commit ${commit.id}`);
  //
  //   // grab the target file from the repo
  //   util.getTarget(payload)
  //     .then((result) => {
  //       console.log(result);
  //     })
  //     .catch((err) => {
  //       console.error(err);
  //     });
  // }
}, {
  json: {
    limit: '5mb', // max Github webhook payload size, ref https://developer.github.com/webhooks/
  },
}).listen(env.PORT);
