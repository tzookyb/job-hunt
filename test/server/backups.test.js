import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { Backups, backupTime } from '../../server/backups.js';
import { tempDir, startApp } from '../helpers.js';

const HOUR = 3600e3, DAY = 24 * HOUR;
const pad = n => String(n).padStart(2, '0');
const name = t => { const d = new Date(t); return `auto-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}.json`; };

async function setup(existingAgesInHours = []) {
  const dir = await tempDir();
  const dataFile = path.join(dir, 'data.json'), backupDir = path.join(dir, 'backups');
  await fs.writeFile(dataFile, '{"v":1}');
  await fs.mkdir(backupDir);
  const now = new Date(2026, 9, 22, 12, 0, 0).getTime();
  for (const h of existingAgesInHours) await fs.writeFile(path.join(backupDir, name(now - h * HOUR)), '{}');
  await fs.writeFile(path.join(backupDir, 'my-own-copy.json'), '{}');
  let clock = now;
  const b = new Backups({ dataFile, dir: backupDir, now: () => clock, log: () => {} });
  return { b, backupDir, list: async () => (await fs.readdir(backupDir)).sort(), tick: ms => { clock += ms; }, now };
}

test('file names carry the backup time', () => {
  assert.equal(backupTime('auto-2026-10-22_12-00-00.json'), new Date(2026, 9, 22, 12).getTime());
  assert.equal(backupTime('my-own-copy.json'), null);
});

test('no backup yet → one is made', async () => {
  const s = await setup();
  assert.match(await s.b.check(), /^auto-2026-10-22_12-00-00\.json$/);
});

test('newest is 7h old → new backup; 8-day-old removed; 3-day-old and own files kept', async () => {
  const s = await setup([7, 3 * 24, 8 * 24]);
  await s.b.check();
  const files = await s.list();
  assert.equal(files.length, 4);
  assert.ok(files.includes('my-own-copy.json'));
  assert.ok(!files.includes(name(s.now - 8 * DAY)));
  assert.ok(files.includes(name(s.now)));
});

test('newest is 2h old → nothing new', async () => {
  const s = await setup([2]);
  assert.equal(await s.b.check(), null);
});

test('checks at most once a minute, but "Back up now" always runs', async () => {
  const s = await setup([10]);
  assert.ok(await s.b.check());
  s.tick(10e3);
  assert.equal(await s.b.check(), null);
  s.tick(1000);
  assert.ok(await s.b.check({ force: true }));
});

test('PUT backs up the version from before the save; POST /api/backup forces one', async () => {
  const app = await startApp();
  try {
    await fs.writeFile(app.config.dataFile, '{"v":"before"}');
    await fetch(app.base + '/api/data', { method: 'PUT', body: '{"v":"after"}' });
    const [first] = await fs.readdir(app.config.backupDir);
    assert.equal(await fs.readFile(path.join(app.config.backupDir, first), 'utf8'), '{"v":"before"}');
    const r = await fetch(app.base + '/api/backup', { method: 'POST' });
    assert.match((await r.json()).name, /^auto-.*\.json$/);
  } finally { await app.close(); }
});
