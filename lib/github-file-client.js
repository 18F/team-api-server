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

GitHubFileClient.prototype.getFile = function(repo, path) {
  return new Promise(function(resolve, reject) {
    this.request.get(BASE_URL + '/repos/' + repo + '/contents/' + path, {
      json: true
    }, function(err, res, body) {
      if (err)
        return reject(err);

      if (res.statusCode === 404) {
        return resolve(null);
      }

      if (res.statusCode === 200) {
        return resolve(body);
      }

      return reject(new Error("Got HTTP " + res.statusCode));
    });
  }.bind(this));
}

GitHubFileClient.prototype.putFile = function(options) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha = options.sha;

  if (content instanceof Buffer) {
    content = content.toString('base64')
  }

  return new Promise(function(resolve, reject) {
    this.request.put(BASE_URL + '/repos/' + repo + '/contents/' + path, {
      json: {
        message: "automated commit!",
        content: content,
        sha: sha
      }
    }, function(err, res, body) {
      if (err)
        return reject(err);

      if (res.statusCode !== 200 && res.statusCode !== 201) {
        console.log(body);
        return reject(new Error("Got HTTP " + res.statusCode));
      }

      resolve(body);
    });
  }.bind(this));
}

GitHubFileClient.prototype.createOrUpdateFile = function(options) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha;

  return this.getFile(repo, path).then(function(body) {
    if (body && body.sha) {
      sha = body.sha;
    }

    return this.putFile({
      path: path,
      repo: repo,
      content: content,
      sha: sha
    });
  }.bind(this));
}

GitHubFileClient.prototype.copyFile = function(options) {
  var source = options.source;
  var dest = options.dest;

  return this.getFile(source.repo, source.path).then(function(body) {
    if (!(body && typeof(body.content) === 'string')) {
      return Promise.reject(new Error('Source is not a file'));
    }

    if (body.encoding !== 'base64') {
      return Promise.reject(new Error('Source is not base64-encoded'));
    }

    return this.createOrUpdateFile({
      repo: dest.repo,
      path: dest.path,
      content: body.content
    });
  }.bind(this));
}

if (!module.parent) {
  // Manual testing code.

  new GitHubFileClient().copyFile({
    source: {
      path: '.about.yml',
      repo: process.env.GITHUB_USERNAME + '/about-yml-testing-sample-project'
    },
    dest: {
      path: '_data/projects/about-yml-testing-sample-project.yml',
      repo: process.env.GITHUB_USERNAME + '/about-yml-testing'
    }
  }).then(function(body) {
    console.log("SUCCESS");
  }).catch(function(e) {
    console.log("ERROR", e);
  });
}
