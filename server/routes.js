// API routes. Each route is a small handler; adding an endpoint means adding an entry here.
import { send, readBody } from './http.js';

export function apiRoutes({ store }) {
  return {
    'GET /api/data': async (req, res) => send(res, 200, await store.read(), 'application/json'),

    'PUT /api/data': async (req, res) => {
      const body = await readBody(req);
      try { JSON.parse(body); } catch { return send(res, 400, 'Invalid JSON'); }
      await store.write(body);
      send(res, 204);
    },
  };
}
