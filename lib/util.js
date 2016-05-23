
const rp = require('request-promise');

function isTargetUpdate(payload, options) {
  if (!payload.ref) {
    return false;
  }

  if (payload.repository.full_name.indexOf(options.githubOrg) !== 0 ||
    payload.ref !== `refs/head/${payload.repository.default_branch}`) {
    return false;
  }


  for (const commit of payload.commits) {
    if ((commit.added.indexOf(options.targetFile) !== -1) ||
      (commit.modified.indexOf(options.targetFile) !== -1)) {
      return true;
    }
  }
  return false;
}

// commit.url would be good to include in the push of TARGET_FILE
function getUpdateCommit(payload, options) {
  for (const commit of payload.commits) {
    if (commit.added.indexOf(options.targetFile) !== -1) {
      return commit;
    }
    if (commit.modified.indexOf(options.targetFile) !== -1) {
      return commit;
    }
  }
  return null;
}

// Returns a promise that will resolve to the contents of TARGET_FILE
function getTarget(payload, options) {
  const url = `https://api.github.com/repos/${payload.repository.full_name}/contents/${options.targetFile}`;
  return rp.get({
    url,
    headers: {
      'User-Agent': options.githubOrg,
    },
  })
  .then(JSON.parse);
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

module.exports = {
  isTargetUpdate,
  getUpdateCommit,
  getTarget,
};
