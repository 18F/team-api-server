
const test = require('tape');

const util = require('../lib/util');

const validOptions = {
  githubOrg: 'test-org',
  targetFile: '.about.yml',
};

const validPayload = {
  ref: 'refs/head/master',
  repository: {
    full_name: 'test-org/test-repo',
    default_branch: 'master',
  },
  commits: [
    { added: ['.about.yml'] },
  ],
};


test('isTargetUpdate', (t) => {
  t.equal(util.isTargetUpdate(validPayload, validOptions), true);

  t.equal(util.isTargetUpdate({
    ref: 'refs/head/master',
    repository: {
      full_name: 'bad-org/bad-repo',
      default_branch: 'master',
    },
  }, validOptions), false);

  t.equal(util.isTargetUpdate({
    ref: 'refs/head/master',
    repository: validPayload.repository,
    commits: [],
  }, validOptions), false);

  t.end();
});
