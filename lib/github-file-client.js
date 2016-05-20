/* jshint node: true */

'use strict';

var request = require('request');

// https://developer.github.com/v3/repos/contents/#update-a-file

var BASE_URL = 'https://api.github.com';

var USER_AGENT = '18F';

function GitHubFileClient(user, pass) {
  this.request = request.defaults({
    auth: {
      user: user || process.env.GITHUB_USERNAME,
      pass: pass || process.env.GITHUB_PASSWORD,
      sendImmediately: true
    },
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
}

GitHubFileClient.prototype.getFile = function(repo, path, cb) {
  this.request.get(BASE_URL + '/repos/' + repo + '/contents/' + path, {
    json: true
  }, function(err, res, body) {
    if (err)
      return cb(err);

    if (res.statusCode === 404) {
      return cb(null, null);
    }

    if (res.statusCode === 200) {
      return cb(null, body);
    }

    return cb(new Error("Got HTTP " + res.statusCode));
  });
}

GitHubFileClient.prototype.putFile = function(options, cb) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha = options.sha;

  this.request.put(BASE_URL + '/repos/' + repo + '/contents/' + path, {
    json: {
      message: "automated commit!",
      content: new Buffer(content).toString('base64'),
      sha: sha
    }
  }, function(err, res, body) {
    if (err)
      return cb(err);

    if (res.statusCode !== 200 && res.statusCode !== 201) {
      console.log(body);
      return cb(new Error("Got HTTP " + res.statusCode));
    }

    cb(null, body);
  });
}

GitHubFileClient.prototype.createOrUpdateFile = function(options, cb) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha;

  this.getFile(repo, path, function(err, body) {
    if (err)
      return cb(err);

    if (body && body.sha) {
      sha = body.sha;
    }

    this.putFile({
      path: path,
      repo: repo,
      content: content,
      sha: sha
    }, cb);
  }.bind(this));
}

if (!module.parent) {
  // Manual testing code.

  new GitHubFileClient().createOrUpdateFile({
    path: '_data/projects/boop.yml',
    repo: 'toolness/about-yml-testing',
    content: 'Hello!'
  }, function(err, body) {
    if (err)
      throw err;

    console.log("SUCCESS");
  });
}
