// `npm run demo`: runs the app on sample data in .demo-data/ (git-ignored), leaving user-data/ alone.
// The sample data is rebuilt on every start, with dates relative to today, so it always looks freshly used.
// `npm run demo -- --keep` keeps what is already in .demo-data/ (your demo edits) instead.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ROOT } from '../server/config.js';
import { createApp } from '../server/app.js';
import { demoData, DEMO_PROFILE, DEMO_FILES } from './demo-data.js';

const config = loadConfig({ ...process.env, DATA_DIR: path.join(ROOT, '.demo-data'), PORT: process.env.PORT || '4318' });
const keep = process.argv.includes('--keep') && fs.existsSync(config.dataFile);

if (!keep) {
  fs.rmSync(config.dataDir, { recursive: true, force: true });   // only ever the demo folder, never user-data/
  fs.mkdirSync(config.cvDir, { recursive: true });
  fs.writeFileSync(config.dataFile, JSON.stringify(demoData(), null, 2));
  for (const f of DEMO_FILES) fs.writeFileSync(path.join(config.cvDir, f.file), f.bytes);
  fs.writeFileSync(path.join(config.dataDir, 'profile.md'), DEMO_PROFILE);
}

createApp(config).listen(config.port, config.host, () => {
  console.log(`Job Hunt demo → http://localhost:${config.port}`);
  console.log(`Demo data: ${config.dataDir} (${keep ? 'kept from last time' : 'rebuilt for today'}; your own data in user-data/ is untouched)`);
});
