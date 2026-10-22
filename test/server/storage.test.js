import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { JsonStore } from '../../server/storage.js';
import { tempDir } from '../helpers.js';

async function store() {
  const dir = await tempDir();
  return new JsonStore({ file: path.join(dir, 'data.json'), previousFile: path.join(dir, 'data.backup.json') });
}

test('read returns {} before anything is saved', async () => {
  assert.equal(await (await store()).read(), '{}');
});

test('write keeps the previous version as a backup', async () => {
  const s = await store();
  await s.write('{"v":1}');
  await s.write('{"v":2}');
  assert.equal(await s.read(), '{"v":2}');
  assert.equal(await fs.readFile(s.previousFile, 'utf8'), '{"v":1}');
});

test('invalid JSON is rejected and leaves the file untouched', async () => {
  const s = await store();
  await s.write('{"v":1}');
  await assert.rejects(s.write('{oops'));
  assert.equal(await s.read(), '{"v":1}');
});
