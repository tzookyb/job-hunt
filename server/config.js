// Runtime configuration: where things live and which port to use.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// All personal data lives in one folder (default: user-data/), so the app can be shared or moved without it.
export function loadConfig(env = process.env) {
  const dataDir = env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(ROOT, 'user-data');
  return {
    port: Number(env.PORT) || 4317,
    host: '127.0.0.1',
    publicDir: path.join(ROOT, 'public'),
    dataDir,
    dataFile: path.join(dataDir, 'data.json'),
    previousFile: path.join(dataDir, 'data.backup.json'),
    backupDir: path.join(dataDir, 'backups'),
  };
}
