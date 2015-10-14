/* jshint node: true */

'use strict';

module.exports.check = function(done, cb) {
  return function(err) { try { cb(err); done(); } catch (e) { done(e); } };
};

module.exports.checkN = function(n, done, cb) {
  return function(err) {
    if (--n === 0) { module.exports.check(done, cb)(err); }
  };
};
