import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { loadConfig, ROOT } from '../../server/config.js';

test('personal data lives in user-data/ unless DATA_DIR says otherwise', () => {
  const def = loadConfig({});
  assert.equal(def.dataFile, path.join(ROOT, 'user-data', 'data.json'));
  assert.equal(def.backupDir, path.join(ROOT, 'user-data', 'backups'));
  assert.equal(def.port, 4317);
  const custom = loadConfig({ DATA_DIR: '/tmp/someone-else', PORT: '5000' });
  assert.equal(custom.dataFile, '/tmp/someone-else/data.json');
  assert.equal(custom.port, 5000);
});
