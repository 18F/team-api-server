/* jshint node: true */

'use strict';

var request = require('request');

// https://developer.github.com/v3/repos/contents/#update-a-file

var BASE_URL = 'https://api.github.com';

var USER_AGENT = '18F';

var AUTH = {
  user: process.env.GITHUB_USERNAME,
  pass: process.env.GITHUB_PASSWORD,
  sendImmediately: true
};

function getFile(options, cb) {
  var repo = options.repo;
  var path = options.path;

  request.get(BASE_URL + '/repos/' + repo + '/contents/' + path, {
    auth: AUTH,
    headers: {
      'User-Agent': USER_AGENT
    },
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

function putFile(options, cb) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha = options.sha;

  request.put(BASE_URL + '/repos/' + repo + '/contents/' + path, {
    auth: AUTH,
    headers: {
      'User-Agent': USER_AGENT
    },
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

function createOrUpdateFile(options, cb) {
  var repo = options.repo;
  var path = options.path;
  var content = options.content;
  var sha;

  getFile({
    path: path,
    repo: repo
  }, function(err, body) {
    if (err)
      return cb(err);

    if (body && body.sha) {
      sha = body.sha;
    }

    putFile({
      path: path,
      repo: repo,
      content: content,
      sha: sha
    }, cb);
  });
}

if (!module.parent) {
  // Manual testing code.

  createOrUpdateFile({
    path: '_data/projects/boop.yml',
    repo: 'toolness/about-yml-testing',
    content: 'Hello!'
  }, function(err, body) {
    if (err)
      throw err;

    console.log("SUCCESS", body);
  });
}
