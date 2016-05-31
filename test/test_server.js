'use strict'; // eslint-disable-line

const test = require('tape');
const supertest = require('supertest');
const mockery = require('mockery');

const payload = require('./fixtures/push_payload.json');

class MockGitHubFileCopier { }

mockery.registerMock('../lib/GitHubFileCopier', MockGitHubFileCopier);
mockery.registerMock('./lib/env', {});

mockery.enable({
  warnOnUnregistered: false,
});

const app = require('../index');

test('doesn\'t GET /', (t) => {
  supertest(app)
    .get('/')
    .expect(404)
    .end((err) => {
      t.error(err);
      t.end();
    });
});

test('accepts push payload at POST /', (t) => {
  supertest(app)
    .post('/')
    .send(payload)
    .expect(202)
    .end((err) => {
      t.error(err);
      t.end(0);
    });
});

test('GET /ping with required headers', (t) => {
  supertest(app)
    .get('/ping')
    .expect(200)
    .expect('X-Frame-Options', 'DENY')
    .expect('X-XSS-Protection', '1')
    .expect('X-Content-Type-Options', 'nosniff')
    .end((err) => {
      t.error(err);
      t.end();
    });
});
