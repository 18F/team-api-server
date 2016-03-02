/* jshint node: true */
'use strict';

var path = require('path');
var ProjectDataUpdater = require('./lib/project-data-updater.js');
var FileLockedOperation = require('file-locked-operation');
var hookshot = require('hookshot');
var packageInfo = require('./package.json');

module.exports.versionString = function() {
  return packageInfo.name + ' v' + packageInfo.version;
};

module.exports.launchServer = function(config) {
  var lockFilePath = path.resolve(config.workingDir, '.update-lock'),
      lock = new FileLockedOperation(lockFilePath),
      buildHook,
      importHook;

  buildHook = hookshot('refs/heads/' + config.branch, function(info) {
    var updater = new ProjectDataUpdater(config, info.repository, lock);
    console.log('rebuilding after update to ' + config.branch);
    updater.pullChangesAndRebuild();
  });
  buildHook.listen(config.buildPort);

  importHook = hookshot('push', function(info) {
    var updater = new ProjectDataUpdater(config, info.repository, lock);
    updater.checkForAndImportUpdates(info);
  });
  importHook.listen(config.updatePort);

  console.log('18F Team API: Listening on port ' + config.buildPort +
    ' for push events on ' + config.branch + ' and port ' + config.updatePort +
    ' for .about.yml updates.');
};
