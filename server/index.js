// Entry point: `npm start`.
import fs from 'node:fs';
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
fs.mkdirSync(config.dataDir, { recursive: true });
createApp(config).listen(config.port, config.host, () => {
  console.log(`Job Hunt running → http://localhost:${config.port}`);
  console.log(`Data file: ${config.dataFile}`);
});
