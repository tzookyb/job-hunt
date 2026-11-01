import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startApp, api } from '../helpers.js';

const pdf = Buffer.from('%PDF-1.4\n% fake cv v1\n');
const upload = (base, name, body) => api(`${base}/api/cvs?name=${encodeURIComponent(name)}`, { method: 'POST', body });

test('a CV upload is stored once by content and served back inline', async () => {
  const app = await startApp();
  try {
    const r = await upload(app.base, 'Idan CV.pdf', pdf);
    assert.equal(r.status, 200);
    const { file, size } = await r.json();
    assert.match(file, /^[a-f0-9]{16}\.pdf$/);
    assert.equal(size, pdf.length);
    assert.deepEqual(await fs.readFile(path.join(app.config.dataDir, 'cvs', file)), pdf);

    // same bytes under another name → same stored file; different bytes → a new one
    assert.equal((await (await upload(app.base, 'copy.PDF', pdf)).json()).file, file);
    const v2 = await (await upload(app.base, 'Idan CV.pdf', Buffer.from('%PDF-1.4\n% v2\n'))).json();
    assert.notEqual(v2.file, file);
    assert.equal((await fs.readdir(path.join(app.config.dataDir, 'cvs'))).length, 2);

    // served without the API header, so links and the preview iframe work
    const got = await fetch(`${app.base}/cv/${file}`);
    assert.equal(got.status, 200);
    assert.equal(got.headers.get('content-type'), 'application/pdf');
    assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await got.arrayBuffer()), pdf);
  } finally { await app.close(); }
});

test('CV uploads refuse unknown types, empty files and requests without the header', async () => {
  const app = await startApp();
  try {
    assert.equal((await upload(app.base, 'cv.html', pdf)).status, 415);
    assert.equal((await upload(app.base, 'cv.svg', pdf)).status, 415);
    assert.equal((await upload(app.base, 'noext', pdf)).status, 415);
    assert.equal((await upload(app.base, 'cv.pdf', Buffer.alloc(0))).status, 400);
    assert.equal((await fetch(`${app.base}/api/cvs?name=cv.pdf`, { method: 'POST', body: pdf })).status, 403);
  } finally { await app.close(); }
});

test('only stored CV names are served: no other files, no path tricks', async () => {
  const app = await startApp();
  try {
    await fs.writeFile(path.join(app.config.dataDir, 'data.json'), '{"secret":1}');
    for (const p of ['/cv/data.json', '/cv/..%2fdata.json', '/cv/%2e%2e%2fdata.json', '/cv/0123456789abcdef.pdf', '/cv/0123456789abcdef.html'])
      assert.equal((await fetch(app.base + p)).status, 404, p);
  } finally { await app.close(); }
});
