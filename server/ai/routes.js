// AI settings and profile endpoints. Under /api/, so server/guard.js covers them. No response ever carries a key.
import fs from 'node:fs/promises';
import path from 'node:path';
import { sendJson, readBody } from '../http.js';
import { ping as defaultPing } from './providers/index.js';
import { scrub } from './secrets.js';

const PROFILE_LIMIT = 50 * 1024;

async function readJson(req, limit = 64 * 1024) {
  try { return JSON.parse(await readBody(req, limit)); }
  catch (e) { throw e.status ? e : Object.assign(new Error('Invalid JSON'), { status: 400 }); }
}

export function aiRoutes({ dataDir, settings, secrets, aiLookup, ping = defaultPing }) {
  const profileFile = path.join(dataDir, 'profile.md');
  return {
    'GET /api/settings': async (req, res) => sendJson(res, 200, await settings.view()),

    'PUT /api/settings': async (req, res) => sendJson(res, 200, await settings.update(await readJson(req))),

    // One tiny request with the saved settings → { ok, model, ms } or { ok: false, error }. Always 200: a failed
    // test is an answer, not a server error. The error is scrubbed of the key.
    'POST /api/settings/test': async (req, res) => {
      const s = await settings.resolve();
      if (!s) return sendJson(res, 200, { ok: false, error: 'Pick a provider first' });
      const key = await secrets.get(s.provider);
      if (s.needsKey && !key) return sendJson(res, 200, { ok: false, error: 'Save an API key first' });
      try {
        const r = await ping({ kind: s.kind, baseURL: s.baseURL, model: s.model, key });
        sendJson(res, 200, { ok: true, model: s.model, ms: r.ms });
      } catch (e) {
        const error = e.code ? e.message : 'Unexpected error: ' + e.message;
        console.warn('[ai] test failed:', scrub(error, key));
        sendJson(res, 200, { ok: false, model: s.model, error: scrub(error, key) });
      }
    },

    // The AI lookup. Body: the company's current fields { name, website?, careersUrl?, jobText? } (the page owns
    // data.json, so the server doesn't read a possibly stale copy). Closing the request cancels the AI call.
    'POST /api/ai/lookup': async (req, res) => {
      const body = await readJson(req, 128 * 1024);
      const ac = new AbortController();
      res.on('close', () => { if (!res.writableEnded) ac.abort(); });
      sendJson(res, 200, await aiLookup(body, { signal: ac.signal }));
    },

    // The owner's profile (CV highlights + what he's looking for), sent to the provider with each analysis.
    'GET /api/profile': async (req, res) => {
      let text = '';
      try { text = await fs.readFile(profileFile, 'utf8'); } catch {}
      sendJson(res, 200, { text });
    },

    'PUT /api/profile': async (req, res) => {
      const { text } = await readJson(req, PROFILE_LIMIT * 4 + 1024);
      if (typeof text !== 'string') throw Object.assign(new Error('Expected { text }'), { status: 400 });
      if (Buffer.byteLength(text) > PROFILE_LIMIT) throw Object.assign(new Error('Profile too long (50 KB max)'), { status: 413 });
      await fs.mkdir(dataDir, { recursive: true });
      const tmp = profileFile + '.tmp';
      await fs.writeFile(tmp, text);
      await fs.rename(tmp, profileFile);
      sendJson(res, 200, { text });
    },
  };
}
