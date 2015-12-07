/* jshint node: true */

'use strict';

var childProcess = require('child_process');

module.exports = ProjectDataUpdater;
module.exports.ABOUT_YML = '.about.yml';

module.exports.isValidUpdate = function(info) {
  var defaultBranch,
      fullName;

  if (info.ref === undefined) {
    return false;
  }

  /* jshint ignore: start */
  fullName = info.repository.full_name;
  defaultBranch = info.repository.default_branch;
  /* jshint ignore: end */

  return fullName.indexOf('18F/', 0) === 0 &&
    info.ref === 'refs/heads/' + defaultBranch;
};

module.exports.fileUpdated = function(commits) {
  var commit;

  for (var i = 0; i != commits.length; i++) {
    commit = commits[i];

    if ((commit.added.indexOf(module.exports.ABOUT_YML) !== -1) ||
      (commit.modified.indexOf(module.exports.ABOUT_YML) !== -1)) {
      return true;
    }
  }

  return false;
};

function ProjectDataUpdater(config, repository, updateLock, done) {
  var that = this;

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

  this.done = done || function(err) {
    if (err) {
      if (err.message) {
        console.log(err);
      }
    } else {
      console.log(that.fullName + ': ' + module.exports.ABOUT_YML +
        ' update sucessful');
    }
  };
}

ProjectDataUpdater.prototype.spawn = function(actionDescription, path, args, workingDir) {
  var that = this;
  var repoName = this.fullName;
  var workingDir = workingDir || that.workingDir;

  return new Promise(function(resolve, reject) {
    var opts = {cwd: workingDir, stdio: 'inherit'};

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
  var that = this;

  // Longer-term: Determine if it most recently appears in commits.removed,
  // whether that means we should delete the project file.
  if (module.exports.isValidUpdate(info) &&
    module.exports.fileUpdated(info.commits)) {
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
    this.done(new Error());
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

ProjectDataUpdater.prototype.updateDataPrivate = function() {
  var that = this;

  this._doLockedOperation(function(done) {
    that.pullChanges()
      .then(function() { return that.updateSubmodules(); })
      .then(function() { return that.addUpdates(); })
      .then(function() { return that.commitDataPrivateUpdates(); })
      .then(function() { return that.pushUpdates(); })
      .then(done, done);
  });
}

ProjectDataUpdater.prototype.pullChanges = function() {
  return this.spawn('pull changes', this.git, ['pull']);
};

ProjectDataUpdater.prototype.importUpdates = function() {
  return this.spawn('import updates', this.ruby,
    [this.updateScript, this.fullName, this.scope, this.defaultBranch]);
};

ProjectDataUpdater.prototype.updateSubmodules = function() {
  return this.spawn('update submodules', this.git, ['submodule', 'update']);
};

ProjectDataUpdater.prototype.addUpdates = function() {
  return this.spawn('add updates', this.git, ['add' , '.']);
};

ProjectDataUpdater.prototype.commitUpdates = function() {
  return this.spawn('commit updates', this.git,
    ['commit', '-m',
     module.exports.ABOUT_YML + ' import from ' + this.fullName]);
};

ProjectDataUpdater.prototype.commitDataPrivateUpdates = function() {
  return this.spawn('commit updates', this.git,
    ['commit', '-m',
     'Updates from ' + this.fullName]);
};

ProjectDataUpdater.prototype.pushUpdates = function() {
  return this.spawn('push updates', this.git, ['push']);
};

ProjectDataUpdater.prototype.buildSite = function() {
  return this.spawn('build site', this.ruby, ['./go', 'build']);
};
