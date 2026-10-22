// GET with redirects, a timeout and a size cap. Resolves null on any failure — never throws.
import http from 'node:http';
import https from 'node:https';

export const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
export const BOT_UA = 'JobHunt/1.0 (personal local job tracker)';

export function httpGet(url, { timeout = 6000, max = 400_000, redirects = 5, ua = BROWSER_UA } = {}) {
  return new Promise(resolve => {
    let u;
    try { u = new URL(url); } catch { return resolve(null); }
    const lib = u.protocol === 'http:' ? http : https;
    const req = lib.get(u, { timeout, headers: { 'User-Agent': ua, Accept: 'text/html,application/json;q=0.9,*/*;q=0.8', 'Accept-Language': 'en-US,en;q=0.8' } }, res => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location && redirects > 0) {
        res.resume();
        let next;
        try { next = new URL(res.headers.location, u).href; } catch { return resolve(null); }
        return resolve(httpGet(next, { timeout, max, redirects: redirects - 1, ua }));
      }
      let body = '';
      const done = () => resolve({ status: res.statusCode, url: u.href, type: res.headers['content-type'] || '', body });
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; if (body.length > max) req.destroy(); });
      res.on('end', done);
      res.on('close', done);
      res.on('error', done);
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}
