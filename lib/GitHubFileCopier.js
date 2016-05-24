'use strict'; // eslint-disable-line

const rp = require('request-promise');

const baseUrl = 'https://api.github.com/repos/';

class GitHubFileCopier {
  constructor(options) {
    this.githubOrg = options.githubOrg;
    this.targetFile = options.targetFile;
    this.destinationRepo = options.destinationRepo;
    this.destinationPath = options.destinationPath;
  }

  wasTargetUpdated(payload) {
    if (!payload.ref) {
      return false;
    }

    if (payload.repository.full_name.indexOf(this.githubOrg) !== 0 ||
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

  // commit.url would be good to include in the push of TARGET_FILE
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

  // Returns a promise that will resolve to the contents of TARGET_FILE
  getTarget(payload) {
    const url = `${baseUrl}${payload.repository.full_name}/contents/${this.targetFile}`;

    return rp.get({
      url,
      headers: {
        'User-Agent': this.githubOrg,
      },
    })
    .then(JSON.parse);
  }

  putTarget(payload, target) {
    // or maybe move the yaml parsing to here?
    console.log(target);
    // const url = `${baseUrl}`
    //   + `${this.destinationRepo}/contents/${this.destinationPath}/`
    //   + `${destinationFile}`;
    // console.log(url, options)
  }

  // TODO: PUT contents of target at DESTINATION
  // const url =  `https://api.github.com/repos/:owner/:repo/contents/:path`;
  // return rp.put {path*, message*, content*, sha*, branch}
  // ref: https://developer.github.com/v3/repos/contents/#update-a-file

  // Returns a promise
  // function putProjectFileContents(payload) {
  //   const projectName = 'test';
  //   const url = `https://api.github.com/repos/${repository.full_name}/contents/_data/projects/${projectName}.yml`;
  //
  //   return rp.put();
  // }

}

module.exports = GitHubFileCopier;
