
const test = require('tape');

const GitHubFileCopier = require('../lib/GitHubFileCopier');

const copierArgs = {
  githubOrg: 'test-org',
  targetFile: '.about.yml',
  destinationRepo: 'destination',
  destinationPath: 'destination-path/',
  destinationBranch: 'master',
};


test('wasTargetUpdated', (t) => {
  const fileCopier = new GitHubFileCopier(copierArgs);

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

test('getUpdateCommit', (t) => {
  const fileCopier = new GitHubFileCopier(copierArgs);

  const validPayload = {
    commits: [{
      added: [],
      modified: ['.about.yml'],
    }],
  };
  t.ok(fileCopier.getUpdateCommit(validPayload));

  const invalidPayload = {
    commits: [{
      added: [],
      modified: ['something-else.js'],
    }],
  };
  t.notOk(fileCopier.getUpdateCommit(invalidPayload));
  t.end();
});

test('getTargetContents', (t) => {
  const fileCopier = new GitHubFileCopier(copierArgs);

  const payload = {
    repository: { full_name: 'test-org/source-repo' },
  };

  t.plan(3);

  fileCopier.rp.get = (opts) => {
    t.equals(opts.url, `${payload.repository.full_name}/contents/${copierArgs.targetFile}`,
      'uses correct api path to GET the target');
    return new Promise((resolve) => {
      resolve({ prop: 'value' });
    });
  };

  fileCopier.getTargetContents(payload)
    .then((result) => {
      t.ok(result);
      t.equals(result.prop, 'value', 'returns JSON of the resolved value');
    });
});

test('putTarget', (t) => {
  const fileCopier = new GitHubFileCopier(copierArgs);

  const payload = {
    commits: [{
      added: [],
      modified: ['.about.yml'],
      url: 'http://example.com',
      committer: {
        username: 'aUsername',
      },
    }],
  };
  const target = {
    content: 'content',
    sha: 'abcde',
  };
  const destination = {
    content: 'old-content',
    sha: 'uvwxyz',
  };

  const destinationFile = 'destination.yml';

  const destinationUrl = `${copierArgs.githubOrg}/${copierArgs.destinationRepo}`
    + `/contents/${copierArgs.destinationPath}/${destinationFile}`;

  t.plan(6);

  fileCopier.rp.get = (opts) => {
    const p = new Promise((resolve) => {
      if (opts.url === destinationUrl) {
        resolve(destination);
      } else {
        resolve(null);
      }
    });
    return p;
  };

  fileCopier.rp.put = (opts) => {
    t.equals(opts.url, destinationUrl, 'uses correct api url to PUT the target file');

    t.equals(opts.json.content, target.content, 'target content is sent');
    t.equals(opts.json.sha, destination.sha,
      'destination sha is sent when destination file exists');
    t.equals(opts.json.branch, copierArgs.destinationBranch, 'destinationBranch is sent');
    t.ok(opts.json.message.indexOf('aUsername') !== -1,
      'commit message contains committer username');
    t.ok(opts.json.message.indexOf('http://example.com') !== -1,
      'commit message contains commit url');
  };

  fileCopier.putTarget(payload, target, destinationFile);
});
