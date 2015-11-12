/* jshint node: true */

'use strict';

var childProcess = require('child_process');

module.exports = ProjectDataUpdater;
module.exports.ABOUT_YML = '.about.yml';

module.exports.isValidUpdate = function(info) {
  if (info.ref === undefined) { return false; }
  var fullName;
  var defaultBranch;
  /* jshint ignore: start */
  fullName = info.repository.full_name;
  defaultBranch = info.repository.default_branch;
  /* jshint ignore: end */
  return fullName.indexOf('18F/', 0) === 0 &&
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

function ProjectDataUpdater(config, repository, updateLock, done) {
  this.workingDir = config.workingDir;
  this.git = config.git;
  this.ruby = config.ruby;
  /* jshint ignore:start */
  this.fullName = repository.full_name;
  this.defaultBranch = repository.default_branch;
  /* jshint ignore:end */
  this.scope = repository.private ? 'private' : 'public';
  this.lock = updateLock;
  this.updateScript = config.updateScript;

  var that = this;
  this.done = done || function(err) {
    if (err === null) {
      console.log(that.fullName + ': ' + module.exports.ABOUT_YML +
        ' update sucessful');
    }
  };
}

ProjectDataUpdater.prototype.spawn = function(actionDescription, path, args) {
  var that = this;
  var repoName = this.fullName;
  return new Promise(function(resolve, reject) {
    var opts = {cwd: that.workingDir, stdio: 'inherit'};
    childProcess.spawn(path, args, opts).on('close', function(exitStatus) {
      if (exitStatus !== 0) {
        reject(new Error(repoName + ': failed to ' + actionDescription));
      } else {
        resolve();
      }
    });
  });
};

ProjectDataUpdater.prototype._doLockedOperation = function(operation) {
  this.lock.doLockedOperation(operation, this.done);
};

ProjectDataUpdater.prototype.checkForAndImportUpdates = function(info) {
  // Longer-term: Determine if it most recently appears in commits.removed,
  // whether that means we should delete the project file.
  if (module.exports.isValidUpdate(info) &&
    module.exports.fileUpdated(info.commits)) {
    var that = this;
    this._doLockedOperation(function(done) {
      that.pullChanges()
        .then(function() { return that.importUpdates(); })
        .then(function() { return that.buildSite(); })
        .then(function() { return that.addUpdates(); })
        .then(function() { return that.commitUpdates(); })
        .then(function() { return that.pushUpdates(); })
        .then(done, done);
    });
  } else {
    this.done(true);
  }
};

ProjectDataUpdater.prototype.pullChangesAndRebuild = function() {
  var that = this;
  this._doLockedOperation(function(done) {
    that.pullChanges()
      .then(function() { return that.buildSite(); })
      .then(done, done);
  });
};

ProjectDataUpdater.prototype.pullChanges = function() {
  return this.spawn('pull changes', this.git, ['pull']);
};

ProjectDataUpdater.prototype.importUpdates = function() {
  return this.spawn('import updates', this.ruby,
    [this.updateScript, this.fullName, this.scope, this.defaultBranch]);
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
  return this.spawn('build site', this.ruby, ['./go', 'build']);
};
