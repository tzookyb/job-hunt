// Builds the HTTP server from its parts, so tests can run it with their own config.
import http from 'node:http';
import { JsonStore } from './storage.js';
import { apiRoutes } from './routes.js';
import { serveStatic } from './static.js';
import { send } from './http.js';

export function createApp(config) {
  const store = new JsonStore({ file: config.dataFile, previousFile: config.previousFile });
  const routes = apiRoutes({ store, config });
  const statics = serveStatic(config.publicDir);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    try {
      const route = routes[`${req.method} ${url.pathname}`];
      if (route) return await route(req, res, url);
      if (req.method === 'GET' && await statics(req, res, url.pathname)) return;
      send(res, 404, 'Not found');
    } catch (e) {
      console.error(e);
      if (!res.headersSent) send(res, e.status || 500, e.status ? e.message : 'Server error');
    }
  });
}
