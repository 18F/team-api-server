
const test = require('tape');
const supertest = require('supertest');

const app = require('../index');

const payload = require('./fixtures/push_payload.json');

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
