// AI settings: which provider and model to use. Kept in user-data/settings.json, not data.json: the page rewrites
// data.json wholesale on every save, so a server-side setting there would be overwritten. Nothing secret lives here;
// the key goes through server/ai/secrets.js and only `hasKey`/`keyHint`/`keySource` ever leave the server.
// Only the providers in server/ai/providers.js can be chosen (all free); a saved provider that's no longer listed
// reads as "none". `providers` is injectable so tests can point a provider at a fake server.
import fs from 'node:fs/promises';
import path from 'node:path';
import { PROVIDERS, publicView } from './providers.js';

const DEFAULTS = { provider: '', model: '', webSearch: false };
const bad = message => Object.assign(new Error(message), { status: 400 });

export function createSettings({ file, secrets, providers = PROVIDERS }) {
  const find = id => providers.find(p => p.id === id);

  async function read() {
    let d = {};
    try { d = JSON.parse(await fs.readFile(file, 'utf8')) || {}; } catch {}
    const s = { ...DEFAULTS };
    if (find(d.provider)) s.provider = d.provider;
    if (typeof d.model === 'string') s.model = d.model;
    s.webSearch = d.webSearch === true;
    return s;
  }

  async function write(s) {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(s, null, 2) + '\n');
    await fs.rename(tmp, file);
  }

  // What the settings screen sees: the settings, key status for every provider, and the providers with their
  // free-key guides.
  async function view() {
    const s = await read();
    const keys = {};
    for (const p of providers) keys[p.id] = await secrets.info(p.id);
    const current = keys[s.provider] || { hasKey: false, keyHint: '', keySource: '' };
    return { ...s, ...current, keys, providers: publicView(providers) };
  }

  // Saves the fields present in `body`. `apiKey`: a string saves it for that provider, '' removes it.
  // Everything is checked before anything is written.
  async function update(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw bad('Expected an object');
    const s = await read();
    if ('provider' in body) {
      if (body.provider !== '' && !find(body.provider)) throw bad('Unknown provider');
      s.provider = body.provider;
    }
    if ('model' in body) {
      const m = String(body.model ?? '').trim();
      if (m.length > 200 || /[\s\x00-\x1f]/.test(m)) throw bad('That doesn\'t look like a model name');
      s.model = m;
    }
    if ('webSearch' in body) s.webSearch = body.webSearch === true;
    if ('apiKey' in body) {
      if (!s.provider) throw bad('Pick a provider first');
      if (typeof body.apiKey !== 'string') throw bad('That doesn\'t look like an API key');
      if (body.apiKey.trim()) await secrets.set(s.provider, body.apiKey);
      else await secrets.remove(s.provider);
    }
    await write(s);
    return view();
  }

  // What the adapters need: kind, where to send requests and the model (the user's, else the provider's default).
  // null when no provider is picked.
  const resolve = async () => {
    const s = await read();
    const p = find(s.provider);
    if (!p) return null;
    return { ...s, kind: p.kind, needsKey: p.needsKey, baseURL: p.baseURL, model: s.model || p.model };
  };

  return { read, view, update, resolve };
}
