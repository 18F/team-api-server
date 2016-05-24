
const test = require('tape');

const GitHubFileCopier = require('../lib/GitHubFileCopier');

const fileCopier = new GitHubFileCopier({
  githubOrg: 'test-org',
  targetFile: '.about.yml',
  destinationRepo: 'test-org/destination',
  destinationPath: 'destination-path/',
});


const validPayload = {
  ref: 'refs/heads/master',
  repository: {
    full_name: 'test-org/test-repo',
    default_branch: 'master',
  },
  commits: [
    { added: ['.about.yml'] },
  ],
};


test('wasTargetUpdated', (t) => {
  t.equal(fileCopier.wasTargetUpdated(validPayload), true);

  t.equal(fileCopier.wasTargetUpdated({
    ref: 'refs/head/master',
    repository: {
      full_name: 'bad-org/bad-repo',
      default_branch: 'master',
    },
  }), false);

  t.equal(fileCopier.wasTargetUpdated({
    ref: 'refs/head/master',
    repository: validPayload.repository,
    commits: [],
  }), false);

  t.end();
});
