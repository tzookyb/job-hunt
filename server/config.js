// Runtime configuration: where things live and which port to use.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function loadConfig(env = process.env) {
  const dataDir = ROOT;
  return {
    port: Number(env.PORT) || 4317,
    host: '127.0.0.1',
    publicDir: path.join(ROOT, 'public'),
    dataDir,
    dataFile: path.join(dataDir, 'data.json'),
    previousFile: path.join(dataDir, 'data.backup.json'),
  };
}
