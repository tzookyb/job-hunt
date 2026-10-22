// Entry point: `npm start`.
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const config = loadConfig();
createApp(config).listen(config.port, config.host, () => {
  console.log(`Job Hunt running → http://localhost:${config.port}`);
  console.log(`Data file: ${config.dataFile}`);
});
