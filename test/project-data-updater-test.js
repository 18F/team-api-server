/* jshint node: true */
/* jshint expr: true */
/* jshint mocha: true */
'use strict';

var path = require('path');
var ProjectDataUpdater = require(
  path.resolve(path.dirname(__dirname), 'lib', 'project-data-updater.js'));
var FileLockedOperation = require('file-locked-operation');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var childProcess = require('child_process');
var mockSpawn = require('mock-spawn');
var temp = require('temp');

var config = require('../team-api-config.json');
config.ruby = '/usr/bin/ruby';
config.bundler = '/usr/bin/bundler';
config.git = '/usr/bin/git';
config.updateScript = path.resolve(path.dirname(__dirname),
  'scripts', 'projects', 'update_project_from_about_yml.rb');

var expect = chai.expect;
chai.should();
chai.use(chaiAsPromised);

describe('isValidUpdate', function() {
  it('should return false if not from an 18F repository', function() {
    var payload = {'repository': {'full_name': 'mbland/team-api'}};
    expect(ProjectDataUpdater.isValidUpdate(payload, '18F')).to.be.false;
  });

  it('should return false if ref is undefined', function() {
    var payload = {
      'repository': {'full_name': '18F/team-api', 'default_branch': 'master'}
    };
    expect(ProjectDataUpdater.isValidUpdate(payload, '18F')).to.be.false;
  });

  it('should return false if not from the default branch', function() {
    var payload = {
      'repository': {'full_name': '18F/team-api', 'default_branch': 'master'},
      'ref': 'refs/heads/not-the-default'
    };
    expect(ProjectDataUpdater.isValidUpdate(payload, '18F')).to.be.false;
  });

  it('should return true if from the default branch', function() {
    var payload = {
      'repository': {'full_name': '18F/team-api', 'default_branch': 'master'},
      'ref': 'refs/heads/master'
    };
    expect(ProjectDataUpdater.isValidUpdate(payload, '18F')).to.be.true;
  });
});

describe('fileUpdated', function() {
  it('should return false when no commits exist', function() {
    expect(ProjectDataUpdater.fileUpdated([])).to.be.false;
  });

  it('should return false when no files are added or modified', function() {
    expect(ProjectDataUpdater.fileUpdated([{'added': [], 'modified': []}]))
      .to.be.false;
  });

  it('should return false when .about.yml is not affected', function() {
    var commits = [{'added': ['foo', 'bar'], 'modified': ['baz', 'quux']}];
    expect(ProjectDataUpdater.fileUpdated(commits)).to.be.false;
  });

  it('should return true when .about.yml is added', function() {
    var commits = [
      {'added': ['foo', ProjectDataUpdater.ABOUT_YML, 'bar'],
       'modified': ['baz', 'quux']
      }
    ];
    expect(ProjectDataUpdater.fileUpdated(commits)).to.be.true;
  });

  it('should return true when .about.yml is modified', function() {
    var commits = [
      {'added': ['foo', 'bar'],
       'modified': [ProjectDataUpdater.ABOUT_YML, 'baz', 'quux']
      }
    ];
    expect(ProjectDataUpdater.fileUpdated(commits)).to.be.true;
  });
});

describe('ProjectDataUpdater', function() {
  var origSpawn, mySpawn, repository, lock;

  before(function() {
    lock = new FileLockedOperation(temp.path());
  });

  beforeEach(function() {
    origSpawn = childProcess.spawn;
    mySpawn = mockSpawn();
    childProcess.spawn = mySpawn;
    /* eslint-disable */
    repository = { default_branch: 'master', full_name: '18F/team-api' };
    /* eslint-enable */
  });

  afterEach(function() {
    childProcess.spawn = origSpawn;
  });

  var makeUpdater = function() {
    return new ProjectDataUpdater(config, repository, lock);
  };

  var spawnCalls = function() {
    return mySpawn.calls.map(function(value) {
      return value.command + ' ' + value.args.join(' ');
    });
  };

  describe('spawn', function() {
    it('should spawn the specified command', function() {
      mySpawn.sequence.add(mySpawn.simple(0));
      return makeUpdater().spawn('do stuff', '/usr/bin/foo', ['bar', 'baz'])
        .should.be.fulfilled.then(function() {
          expect(spawnCalls()).to.eql(['/usr/bin/foo bar baz']);
        });
    });

    it('should pass an error to the callback on nonzero exit', function() {
      mySpawn.sequence.add(mySpawn.simple(1));
      return makeUpdater().spawn('do stuff', '/usr/bin/foo', ['bar', 'baz'])
        .should.be.rejectedWith(Error, '18F/team-api: failed to do stuff');
    });
  });

  describe('importUpdates', function() {
    it('should spawn the update script for a private repo', function() {
      repository.private = true;
      mySpawn.sequence.add(mySpawn.simple(0));
      return makeUpdater().importUpdates()
        .should.be.fulfilled.then(function() {
          expect(spawnCalls()).to.eql(
            [['/usr/bin/bundler', 'exec', config.updateScript,
              repository.full_name, 'private',  // jshint ignore:line
              repository.default_branch].join(' ')]);  // jshint ignore:line
        });
    });

    it('should spawn the update script for a public repo', function() {
      mySpawn.sequence.add(mySpawn.simple(0));
      return makeUpdater().importUpdates()
        .should.be.fulfilled.then(function() {
          expect(spawnCalls()).to.eql(
            [['/usr/bin/bundler', 'exec', config.updateScript,
              repository.full_name, 'public',  // jshint ignore:line
              repository.default_branch].join(' ')]);  // jshint ignore:line
        });
    });

    it('should return an error if the update script fails', function() {
      mySpawn.sequence.add(mySpawn.simple(1));
      return makeUpdater().importUpdates()
        .should.be.rejectedWith('18F/team-api: failed to import updates');
    });
  });

  describe('checkForAndImportUpdates', function() {
    it('should exit early if update is not valid', function() {
      return makeUpdater().checkForAndImportUpdates({}).should.be.fulfilled
        .then(function() {
          expect(mySpawn.calls.length).to.equal(0);
        });
    });

    it('should exit early if .about.yml was not updated', function() {
      var payload = {
        'repository': {'full_name': '18F/team-api', 'default_branch': 'master'},
        'ref': 'refs/heads/master', 'commits': []
      };

      return makeUpdater().checkForAndImportUpdates(payload)
        .should.be.fulfilled.then(function() {
          expect(mySpawn.calls.length).to.equal(0);
        });
    });

    var validPayload = function() {
      return {
        'repository': {'full_name': '18F/team-api', 'default_branch': 'master'},
        'ref': 'refs/heads/master',
        'commits': [{'added': [], 'modified': [ProjectDataUpdater.ABOUT_YML]}]
      };
    };

    it('should complete the update when all is well', function() {
      mySpawn.setDefault(mySpawn.simple(0));
      return makeUpdater().checkForAndImportUpdates(validPayload())
        .should.be.fulfilled
        .then(function() {
          expect(spawnCalls()).to.eql(
            ['/usr/bin/git fetch origin master',
             '/usr/bin/git clean -f',
             '/usr/bin/git reset --hard origin/master',
             '/usr/bin/bundler install --path=' +
               path.join('vendor', 'bundle'),
             ['/usr/bin/bundler', 'exec', config.updateScript,
              repository.full_name, 'public',  // jshint ignore:line
              repository.default_branch].join(' '),  // jshint ignore:line
             '/usr/bin/ruby /usr/local/18f/team-api/team-api.18f.gov/go build',
             '/usr/bin/git add .',
             ['/usr/bin/git commit -m', ProjectDataUpdater.ABOUT_YML,
              'import from 18F/team-api'].join(' '),
             '/usr/bin/git push']);
        });
    });

    it('should abort the process if a step fails', function() {
      mySpawn.sequence.add(mySpawn.simple(0));
      mySpawn.sequence.add(mySpawn.simple(0));
      mySpawn.sequence.add(mySpawn.simple(0));
      mySpawn.sequence.add(mySpawn.simple(0));
      mySpawn.sequence.add(mySpawn.simple(0));
      mySpawn.sequence.add(mySpawn.simple(1));

      return makeUpdater().checkForAndImportUpdates(validPayload())
        .should.be.rejectedWith('18F/team-api: failed to build site')
        .then(function() {
          expect(mySpawn.calls.length).to.equal(6);
        });
    });

    it('separate updates should not overlap', function() {
      var firstUpdate = makeUpdater()
            .checkForAndImportUpdates(validPayload()),
          secondUpdate = makeUpdater()
            .checkForAndImportUpdates(validPayload());

      mySpawn.setDefault(mySpawn.simple(0));
      return firstUpdate.should.be.fulfilled.then(function() {
        return secondUpdate.should.be.fulfilled.then(function() {
          expect(mySpawn.calls.length).to.equal(18);
          var calls = spawnCalls();

          // Without a locking mechanism, every odd-numbered call will be
          // equal to the subsequent even-numbered call, rather than the
          // first half of calls equaling the second half.
          expect(calls.slice(0, 9)).to.eql(calls.slice(9, 19));
        });
      });
    });
  });

  describe('pullChangesAndRebuild', function() {
    it('should execute git pull and ./go build', function() {
      mySpawn.setDefault(mySpawn.simple(0));
      return makeUpdater().pullChangesAndRebuild()
        .should.be.fulfilled.then(function() {
          expect(spawnCalls()).to.eql(
            ['/usr/bin/git fetch origin master',
             '/usr/bin/git clean -f',
             '/usr/bin/git reset --hard origin/master',
             '/usr/bin/bundler install --path=' +
               path.join('vendor', 'bundle'),
             '/usr/bin/ruby /usr/local/18f/team-api/team-api.18f.gov/go ' +
               'build']);
        });
    });
  });
});
