import { test } from 'node:test';
import assert from 'node:assert/strict';
import { startApp } from '../helpers.js';

test('data API round-trips JSON and rejects invalid bodies', async () => {
  const app = await startApp();
  try {
    assert.deepEqual(await (await fetch(app.base + '/api/data')).json(), {});
    const put = await fetch(app.base + '/api/data', { method: 'PUT', body: '{"companies":[]}' });
    assert.equal(put.status, 204);
    assert.deepEqual(await (await fetch(app.base + '/api/data')).json(), { companies: [] });
    assert.equal((await fetch(app.base + '/api/data', { method: 'PUT', body: 'nope' })).status, 400);
  } finally { await app.close(); }
});

test('static files are served, paths outside public/ are not', async () => {
  const app = await startApp();
  try {
    const home = await fetch(app.base + '/');
    assert.equal(home.status, 200);
    assert.match(home.headers.get('content-type'), /text\/html/);
    assert.equal((await fetch(app.base + '/..%2fpackage.json')).status, 404);
    assert.equal((await fetch(app.base + '/missing.js')).status, 404);
  } finally { await app.close(); }
});
