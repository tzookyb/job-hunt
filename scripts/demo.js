// `npm run demo`: runs the app on fictional sample data in .demo-data/ (git-ignored), leaving user-data/ alone.
// Delete .demo-data/ to start the demo over.
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig, ROOT } from '../server/config.js';
import { createApp } from '../server/app.js';
import { demoData } from './demo-data.js';

const config = loadConfig({ ...process.env, DATA_DIR: path.join(ROOT, '.demo-data'), PORT: process.env.PORT || '4318' });
fs.mkdirSync(config.dataDir, { recursive: true });
if (!fs.existsSync(config.dataFile)) fs.writeFileSync(config.dataFile, JSON.stringify(demoData(), null, 2));

createApp(config).listen(config.port, config.host, () => {
  console.log(`Job Hunt demo → http://localhost:${config.port}`);
  console.log(`Demo data: ${config.dataDir} (your own data in user-data/ is untouched)`);
});
