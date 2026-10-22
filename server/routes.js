// API routes. Each route is a small handler; adding an endpoint means adding an entry here.
import { send, sendJson, readBody } from './http.js';

// Any read or write counts as using the app: that's when the automatic backup check runs.
const safely = async check => { try { await check(); } catch (e) { console.error('Backup failed:', e.message); } };

export function apiRoutes({ store, lookup, backups }) {
  return {
    'GET /api/data': async (req, res) => {
      await safely(() => backups.check());
      send(res, 200, await store.read(), 'application/json');
    },

    'PUT /api/data': async (req, res) => {
      const body = await readBody(req);
      try { JSON.parse(body); } catch { return send(res, 400, 'Invalid JSON'); }
      await safely(() => backups.check());   // before writing, so the backup holds the last good version
      await store.write(body);
      send(res, 204);
    },

    'POST /api/backup': async (req, res) => sendJson(res, 200, { name: await backups.check({ force: true }) }),

    'GET /api/lookup': async (req, res, url) => {
      const name = (url.searchParams.get('name') || '').trim().slice(0, 100);
      if (!name) return send(res, 400, 'name required');
      sendJson(res, 200, await lookup(name));
    },
  };
}
