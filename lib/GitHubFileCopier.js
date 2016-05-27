'use strict'; // eslint-disable-line

const requestPromise = require('request-promise');

class GitHubFileCopier {
  constructor(options) {
    this.githubOrg = options.githubOrg;
    this.githubUser = options.githubUser;
    this.githubAccessToken = options.githubAccessToken;
    this.targetFile = options.targetFile;
    this.destinationRepo = options.destinationRepo;
    this.destinationPath = options.destinationPath;
    this.destinationBranch = options.destinationBranch;

    this.rp = requestPromise.defaults({
      baseUrl: 'https://api.github.com/repos/',
      json: true,
      auth: {
        user: this.githubUser,
        pass: this.githubAccessToken,
        sendImmediately: true,
      },
      headers: {
        'User-Agent': this.githubOrg,
      },
    });
  }

  wasTargetUpdated(payload) {
    if (!payload.ref) {
      return false;
    }

    if (payload.repository.full_name.indexOf(`${this.githubOrg}/`) !== 0 ||
      payload.ref !== `refs/heads/${payload.repository.default_branch}`) {
      return false;
    }

    for (const commit of payload.commits) {
      if ((commit.added.indexOf(this.targetFile) !== -1) ||
        (commit.modified.indexOf(this.targetFile) !== -1)) {
        return true;
      }
    }
    return false;
  }

  getUpdateCommit(payload) {
    for (const commit of payload.commits) {
      if (commit.added.indexOf(this.targetFile) !== -1) {
        return commit;
      }
      if (commit.modified.indexOf(this.targetFile) !== -1) {
        return commit;
      }
    }
    return null;
  }

  // Returns a promise that will resolve to the parsed contents of targetFile
  getTargetContents(payload) {
    const url = `${payload.repository.full_name}/contents/${this.targetFile}`;
    return this.rp.get({ url });
  }

  // Puts destinationFile at the destination path in the destination repo
  // with a message containing which user was responsible for the initial trigger
  putTarget(payload, target, destinationFile) {
    const url = `${this.githubOrg}/${this.destinationRepo}/contents/${this.destinationPath}/`
      + `${destinationFile}`;

    const updateCommit = this.getUpdateCommit(payload);
    const message = `Update ${destinationFile} from change to ${this.targetFile}`
      + ` by @${updateCommit.committer.username}`
      + `\nref: ${updateCommit.url}`;

    const putArgs = {
      url,
      json: {
        message,
        content: target.content,
        branch: this.destinationBranch,
      },
    };

    // attempt to get the destination file contents
    return this.rp.get({ url })
      .then((destinationContents) => {
        // if the destination file exists, grab its sha because this is an update
        if (destinationContents) {
          putArgs.json.sha = destinationContents.sha;
        }

        return this.rp.put(putArgs);
      })
      .catch(() => this.rp.put(putArgs));
  }
}

module.exports = GitHubFileCopier;
