// Builds the HTTP server from its parts, so tests can run it with their own config.
import http from 'node:http';
import path from 'node:path';
import { JsonStore } from './storage.js';
import { apiRoutes } from './routes.js';
import { serveStatic } from './static.js';
import { send } from './http.js';
import { createLookup } from './lookup/index.js';
import { Backups } from './backups.js';
import { checkRequest } from './guard.js';
import { cvRoutes, serveCv } from './cvs.js';
import { createSecrets } from './ai/secrets.js';
import { createSettings } from './ai/settings.js';
import { aiRoutes } from './ai/routes.js';
import { createAiLookup, profilePath } from './ai/lookup.js';

export function createApp(config, { lookup = createLookup(), backups, secrets, ping, aiLookup, complete, providers } = {}) {
  const store = new JsonStore({ file: config.dataFile, previousFile: config.previousFile });
  backups ||= new Backups({ dataFile: config.dataFile, dir: config.backupDir });
  const cvDir = config.cvDir || path.join(config.dataDir, 'cvs');
  secrets ||= createSecrets({ file: path.join(config.dataDir, 'secrets.json') });
  const settings = createSettings({ file: path.join(config.dataDir, 'settings.json'), secrets, ...(providers ? { providers } : {}) });
  aiLookup ||= createAiLookup({ settings, secrets, lookup, profileFile: profilePath(config.dataDir), ...(complete ? { complete } : {}) });
  const routes = { ...apiRoutes({ store, lookup, backups, config }), ...cvRoutes(cvDir), ...aiRoutes({ dataDir: config.dataDir, settings, secrets, ping, aiLookup }) };
  const statics = serveStatic(config.publicDir);
  const cvs = serveCv(cvDir);

  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');
    const blocked = checkRequest(req, url.pathname);
    if (blocked) return send(res, 403, blocked);
    try {
      const route = routes[`${req.method} ${url.pathname}`];
      if (route) return await route(req, res, url);
      if (req.method === 'GET' && (await cvs(req, res, url.pathname) || await statics(req, res, url.pathname))) return;
      send(res, 404, 'Not found');
    } catch (e) {
      console.error(e);
      if (!res.headersSent) send(res, e.status || 500, e.status ? e.message : 'Server error');
    }
  });
}
