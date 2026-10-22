// Serves files from the public folder. Only known file types, never anything outside the folder.
import fs from 'node:fs/promises';
import path from 'node:path';
import { send } from './http.js';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

export function serveStatic(publicDir) {
  const root = path.resolve(publicDir);
  return async (req, res, pathname) => {
    const rel = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).replace(/^\/+/, '');
    const file = path.resolve(root, rel);
    const type = TYPES[path.extname(file)];
    if (!file.startsWith(root + path.sep) || !type) return false;
    try { send(res, 200, await fs.readFile(file), type); return true; }
    catch { return false; }
  };
}
