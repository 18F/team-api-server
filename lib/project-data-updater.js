/* jshint node: true */

'use strict';

var childProcess = require('child_process');
var path = require('path');

module.exports = ProjectDataUpdater;
module.exports.ABOUT_YML = '.about.yml';

module.exports.isValidUpdate = function(info, gitHubOrg) {
  if (info.ref === undefined) { return false; }
  var fullName;
  var defaultBranch;
  fullName = info.repository.full_name;
  defaultBranch = info.repository.default_branch;
  return fullName.indexOf(gitHubOrg + '/', 0) === 0 &&
    info.ref === 'refs/heads/' + defaultBranch;
};

module.exports.fileUpdated = function(commits) {
  for (var i = 0; i != commits.length; i++) {
    var commit = commits[i];
    if ((commit.added.indexOf(module.exports.ABOUT_YML) !== -1) ||
      (commit.modified.indexOf(module.exports.ABOUT_YML) !== -1)) {
      return true;
    }
  }
  return false;
};

function ProjectDataUpdater(config, repository, updateLock) {
  this.gitHubOrg = config.gitHubOrg;
  this.workingDir = config.workingDir;
  this.git = config.git;
  this.ruby = config.ruby;
  this.bundler = config.bundler;
  /* jshint ignore:start */
  this.fullName = repository.full_name;
  this.defaultBranch = repository.default_branch;
  /* jshint ignore:end */
  this.scope = repository.private ? 'private' : 'public';
  this.lock = updateLock;
  this.updateScript = config.updateScript;
}

ProjectDataUpdater.prototype.spawn = function(actionDescription, path, args) {
  var that = this;
  var repoName = this.fullName;
  return new Promise(function(resolve, reject) {
    var opts = { cwd: that.workingDir };
    childProcess.spawn(path, args, opts).on('close', function(exitStatus) {
      if (exitStatus !== 0) {
        reject(new Error(repoName + ': failed to ' + actionDescription));
      } else {
        resolve();
      }
    });
  });
};

ProjectDataUpdater.prototype.checkForAndImportUpdates = function(info) {
  // Longer-term: Determine if it most recently appears in commits.removed,
  // whether that means we should delete the project file.
  var updater = this;

  if (module.exports.isValidUpdate(info, this.gitHubOrg) &&
    module.exports.fileUpdated(info.commits)) {

    return this.lock.doLockedOperation(function() {
      return updater.pullChanges()
        .then(function() { return updater.importUpdates(); })
        .then(function() { return updater.buildSite(); })
        .then(function() { return updater.addUpdates(); })
        .then(function() { return updater.commitUpdates(); })
        .then(function() { return updater.pushUpdates(); });
    });
  }
  return Promise.resolve();
};

ProjectDataUpdater.prototype.pullChangesAndRebuild = function() {
  var updater = this;

  return this.lock.doLockedOperation(function() {
    return updater.pullChanges().then(function() {
      return updater.buildSite();
    });
  });
};

ProjectDataUpdater.prototype.pullChanges = function() {
  var updater = this;

  return this.spawn('fetch changes', this.git, ['fetch', 'origin', 'master'])
    .then(function() {
      return updater.spawn('clean', updater.git, ['clean', '-f']);
    })
    .then(function() {
      return updater.spawn(
        'reset', updater.git, ['reset', '--hard', 'origin/master']);
    })
    .then(function() {
      return updater.spawn('install bundle', updater.bundler,
        ['install', '--path=' + path.join('vendor', 'bundle')]);
    });
};

ProjectDataUpdater.prototype.importUpdates = function() {
  return this.spawn('import updates', this.bundler,
    ['exec', this.updateScript, this.fullName, this.scope, this.defaultBranch]);
};

ProjectDataUpdater.prototype.addUpdates = function() {
  return this.spawn('add updates', this.git, ['add' , '.']);
};

ProjectDataUpdater.prototype.commitUpdates = function() {
  return this.spawn('commit updates', this.git,
    ['commit', '-m',
     module.exports.ABOUT_YML + ' import from ' + this.fullName]);
};

ProjectDataUpdater.prototype.pushUpdates = function() {
  return this.spawn('push updates', this.git, ['push']);
};

ProjectDataUpdater.prototype.buildSite = function() {
  return this.spawn('build site', this.ruby,
    [path.join(this.workingDir, 'go'), 'build']);
};
