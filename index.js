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
    var updater = new ProjectDataUpdater(config, info.repository, lock),
        done = logResult('rebuild after update to ' + config.branch);
    return updater.pullChangesAndRebuild().then(done, done);
  });
  buildHook.listen(config.buildPort);

  importHook = hookshot('push', function(info) {
    var updater = new ProjectDataUpdater(config, info.repository, lock),
        done = logResult(updater.fullName + ' ' +
          ProjectDataUpdater.ABOUT_YML);
    return updater.checkForAndImportUpdates(info).then(done, done);
  });
  importHook.listen(config.updatePort);

  console.log('18F Team API: Listening on port ' + config.buildPort +
    ' for push events on ' + config.branch + ' and port ' + config.updatePort +
    ' for .about.yml updates.');
};

function logResult(operation) {
  return function(result) {
    return Promise(function(resolve, reject) {
      if (result instanceof Error) {
        console.error(operation + 'failed: ' + result.message);
        return reject(result);
      }
      console.log(operation + ' succeeded');
      return resolve(result);
    });
  };
}
