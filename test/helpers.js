// Shared test helpers: a throwaway data folder and a running app on a random port.
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/app.js';
import { ROOT } from '../server/config.js';

export async function tempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), 'job-hunt-test-'));
}

export async function startApp(overrides = {}) {
  const dataDir = overrides.dataDir || await tempDir();
  const config = {
    host: '127.0.0.1', port: 0, publicDir: path.join(ROOT, 'public'), dataDir,
    dataFile: path.join(dataDir, 'data.json'), previousFile: path.join(dataDir, 'data.backup.json'),
    ...overrides,
  };
  const server = createApp(config);
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { config, base, close: () => new Promise(r => server.close(r)) };
}
