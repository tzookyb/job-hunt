// CV files sent with applications. Each file is stored once, named by a hash of its content
// (`user-data/cvs/<hash>.<ext>`), so the exact version you sent is kept even if you later edit the original, and
// uploading the same file twice doesn't duplicate it. Which company got which CV is kept in data.json (`cvs`, `c.cv`).
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { send, sendJson, readBuffer } from './http.js';

export const MAX_CV_BYTES = 15 * 1024 * 1024;

export const CV_TYPES = {
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.odt': 'application/vnd.oasis.opendocument.text',
  '.rtf': 'application/rtf',
  '.pages': 'application/x-iwork-pages-sffpages',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

const STORED = /^[a-f0-9]{16}\.[a-z]{2,5}$/;

export const cvExt = name => path.extname(String(name || '')).toLowerCase();

export function cvRoutes(cvDir) {
  return {
    // Body: the raw file. ?name=<original file name> (for its extension). → { file, size }
    'POST /api/cvs': async (req, res, url) => {
      const ext = cvExt(url.searchParams.get('name'));
      if (!CV_TYPES[ext]) return send(res, 415, `Unsupported file type. Use one of: ${Object.keys(CV_TYPES).join(' ')}`);
      const body = await readBuffer(req, MAX_CV_BYTES);
      if (!body.length) return send(res, 400, 'Empty file');
      const file = crypto.createHash('sha256').update(body).digest('hex').slice(0, 16) + ext;
      const target = path.join(cvDir, file);
      await fs.mkdir(cvDir, { recursive: true });
      try { await fs.access(target); }
      catch {
        const tmp = target + '.tmp';
        await fs.writeFile(tmp, body);
        await fs.rename(tmp, target);
      }
      sendJson(res, 200, { file, size: body.length });
    },
  };
}

// GET /cv/<file>: the stored file, shown inline so the page can preview it. Lives outside /api/ so a plain link,
// <iframe> or download works (they can't send the X-Job-Hunt header); names are unguessable content hashes.
export function serveCv(cvDir) {
  return async (req, res, pathname) => {
    const m = /^\/cv\/([^/]+)$/.exec(pathname);
    if (!m) return false;
    const file = decodeURIComponent(m[1]);
    if (!STORED.test(file) || !CV_TYPES[cvExt(file)]) { send(res, 404, 'Not found'); return true; }
    let body;
    try { body = await fs.readFile(path.join(cvDir, file)); }
    catch { send(res, 404, 'Not found'); return true; }
    res.writeHead(200, {
      'Content-Type': CV_TYPES[cvExt(file)],
      'Content-Length': body.length,
      'Cache-Control': 'private, max-age=31536000, immutable',   // content-addressed: never changes
      'X-Content-Type-Options': 'nosniff',   // no HTML/SVG types are accepted, so nothing here can run script
    });
    res.end(body);
    return true;
  };
}
