import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { startApp } from '../helpers.js';

// Raw request, so tests can set headers fetch() won't let us set (Host, Origin, Sec-Fetch-Site).
function raw(base, path, headers = {}, method = 'GET') {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path, method, headers }, res => {
      let body = '';
      res.on('data', c => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('the API needs the X-Job-Hunt header', async () => {
  const app = await startApp();
  try {
    assert.equal((await raw(app.base, '/api/data')).status, 403);
    assert.equal((await raw(app.base, '/api/data', { 'X-Job-Hunt': '1' })).status, 200);
    assert.equal((await raw(app.base, '/api/backup', {}, 'POST')).status, 403);
    assert.equal((await raw(app.base, '/api/lookup?name=x')).status, 403);
  } finally { await app.close(); }
});

test('requests addressed to another host are refused (DNS rebinding)', async () => {
  const app = await startApp();
  const port = new URL(app.base).port;
  try {
    const ok = { 'X-Job-Hunt': '1' };
    assert.equal((await raw(app.base, '/api/data', { ...ok, Host: 'evil.example:' + port })).status, 403);
    assert.equal((await raw(app.base, '/', { Host: 'evil.example:' + port })).status, 403);
    assert.equal((await raw(app.base, '/api/data', { ...ok, Host: 'localhost:1' })).status, 403);
    assert.equal((await raw(app.base, '/api/data', { ...ok, Host: 'localhost:' + port })).status, 200);
    assert.equal((await raw(app.base, '/', { Host: 'localhost:' + port })).status, 200);
  } finally { await app.close(); }
});

test('cross-site browser requests are refused, the page itself is not', async () => {
  const app = await startApp();
  const port = new URL(app.base).port;
  const h = { 'X-Job-Hunt': '1', Host: 'localhost:' + port };
  try {
    assert.equal((await raw(app.base, '/api/data', { ...h, Origin: 'https://evil.example' })).status, 403);
    assert.equal((await raw(app.base, '/api/data', { ...h, 'Sec-Fetch-Site': 'cross-site' })).status, 403);
    assert.equal((await raw(app.base, '/api/data', { ...h, 'Sec-Fetch-Site': 'same-site' })).status, 403);
    assert.equal((await raw(app.base, '/api/data', { ...h, Origin: 'http://localhost:' + port, 'Sec-Fetch-Site': 'same-origin' })).status, 200);
    assert.equal((await raw(app.base, '/api/data', { ...h, Origin: 'http://localhost:9999' })).status, 403);
  } finally { await app.close(); }
});

test('a CORS preflight is never approved', async () => {
  const app = await startApp();
  try {
    const r = await raw(app.base, '/api/data', { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'PUT' }, 'OPTIONS');
    assert.equal(r.status, 403);
  } finally { await app.close(); }
});
