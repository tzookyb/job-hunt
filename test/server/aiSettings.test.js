import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { startApp, api } from '../helpers.js';
import { PROVIDERS } from '../../server/ai/providers.js';

const KEY = 'sk-ant-test-0123456789abcdefWXYZ';
const json = (body, method = 'PUT') => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const files = async dir => (await fs.readdir(dir)).sort();

test('settings start empty and list the providers', async () => {
  const app = await startApp();
  try {
    const r = await api(`${app.base}/api/settings`);
    assert.equal(r.status, 200);
    const s = await r.json();
    assert.equal(s.provider, '');
    assert.equal(s.hasKey, false);
    assert.deepEqual(s.providers.map(p => p.id), ['gemini', 'groq', 'openrouter', 'mistral', 'ollama']);
    assert.ok(s.providers.some(p => p.id === 'ollama' && p.needsKey === false));
    assert.deepEqual(s.keys.gemini, { hasKey: false, keyHint: '', keySource: '' });
  } finally { await app.close(); }
});

test('a saved key is never sent back: not in responses, errors, settings.json or data.json', async () => {
  const app = await startApp();
  const seen = [];
  const call = async (url, opts) => { const r = await api(url, opts); const t = await r.text(); seen.push(t); return { status: r.status, body: t }; };
  try {
    let r = await call(`${app.base}/api/settings`, json({ provider: 'groq', model: 'some-model', apiKey: KEY }));
    assert.equal(r.status, 200);
    const s = JSON.parse(r.body);
    assert.equal(s.provider, 'groq');
    assert.equal(s.model, 'some-model');
    assert.deepEqual([s.hasKey, s.keyHint, s.keySource], [true, '…WXYZ', 'file']);
    assert.equal(s.keys.groq.hasKey, true);

    await call(`${app.base}/api/settings`);
    // errors after a key is stored
    r = await call(`${app.base}/api/settings`, json({ provider: 'nope', apiKey: KEY }));
    assert.equal(r.status, 400);
    r = await call(`${app.base}/api/settings`, json({ model: 'bad model', apiKey: KEY }));
    assert.equal(r.status, 400);

    for (const t of seen) assert.ok(!t.includes(KEY), 'key in a response: ' + t.slice(0, 200));
    const settingsFile = await fs.readFile(path.join(app.config.dataDir, 'settings.json'), 'utf8');
    assert.ok(!settingsFile.includes(KEY));
    await api(`${app.base}/api/data`, { method: 'PUT', body: '{"companies":[]}' });
    assert.ok(!(await fs.readFile(app.config.dataFile, 'utf8')).includes(KEY));
    // where it does live: the owner-only secrets file (in tests; the Keychain on the Mac)
    assert.equal(await app.deps.secrets.get('groq'), KEY);
  } finally { await app.close(); }
});

test('an empty apiKey removes the key; keys are kept per provider', async () => {
  const app = await startApp();
  try {
    await api(`${app.base}/api/settings`, json({ provider: 'gemini', apiKey: 'AIza-gemini-000000000000' }));
    await api(`${app.base}/api/settings`, json({ provider: 'groq', apiKey: KEY }));
    let s = await (await api(`${app.base}/api/settings`, json({ provider: 'gemini' }))).json();
    assert.equal(s.hasKey, true);
    s = await (await api(`${app.base}/api/settings`, json({ apiKey: '' }))).json();
    assert.equal(s.hasKey, false);
    assert.equal(s.keys.groq.hasKey, true);
  } finally { await app.close(); }
});

test('bad input is refused and nothing is written', async () => {
  const app = await startApp();
  try {
    const cases = [
      { provider: 'nope' },
      { model: 'has spaces in it' },
      { provider: 'anthropic' },                                    // paid providers aren't offered
      { provider: 'custom' },
      { apiKey: KEY },                                              // no provider yet
      { provider: 'gemini', apiKey: 'short' },
      { provider: 'gemini', apiKey: 42 },
    ];
    for (const body of cases) {
      const r = await api(`${app.base}/api/settings`, json(body));
      assert.equal(r.status, 400, JSON.stringify(body));
    }
    assert.equal((await api(`${app.base}/api/settings`, { method: 'PUT', body: '{' })).status, 400);
    assert.ok(!(await files(app.config.dataDir)).includes('settings.json'));
    assert.ok(!(await files(app.config.dataDir)).includes('secrets.json'));
  } finally { await app.close(); }
});

test('a saved provider that isn\'t listed reads as none', async () => {
  const app = await startApp();
  try {
    await fs.writeFile(path.join(app.config.dataDir, 'settings.json'), JSON.stringify({ provider: 'someone-else', model: 'x' }));
    const s = await (await api(`${app.base}/api/settings`)).json();
    assert.equal(s.provider, '');
    assert.equal(s.keys['someone-else'], undefined);
  } finally { await app.close(); }
});

test('the settings endpoints need the X-Job-Hunt header like every API call', async () => {
  const app = await startApp();
  try {
    assert.equal((await fetch(`${app.base}/api/settings`)).status, 403);
    assert.equal((await fetch(`${app.base}/api/settings`, json({ provider: 'gemini', apiKey: KEY }))).status, 403);
    assert.equal((await fetch(`${app.base}/api/profile`)).status, 403);
    assert.ok(!(await files(app.config.dataDir)).includes('secrets.json'));
  } finally { await app.close(); }
});

test('the profile is stored as user-data/profile.md', async () => {
  const app = await startApp();
  try {
    assert.deepEqual(await (await api(`${app.base}/api/profile`)).json(), { text: '' });
    const text = '# Idan\nSenior frontend — React, TypeScript.\n\nLooking for: product companies.\n';
    assert.equal((await api(`${app.base}/api/profile`, json({ text }))).status, 200);
    assert.equal(await fs.readFile(path.join(app.config.dataDir, 'profile.md'), 'utf8'), text);
    assert.deepEqual(await (await api(`${app.base}/api/profile`)).json(), { text });
    assert.equal((await api(`${app.base}/api/profile`, json({ text: 'x'.repeat(51 * 1024) }))).status, 413);
    assert.equal((await api(`${app.base}/api/profile`, json({ nope: 1 }))).status, 400);
  } finally { await app.close(); }
});

test('every provider is free and has a guide to get a key', () => {
  for (const p of PROVIDERS) {
    assert.match(p.keyUrl, /^https:\/\//, p.id);
    assert.ok(p.keyLink && p.free && p.steps.length >= 2, p.id);
    assert.equal(p.kind, 'openai', p.id);
    assert.ok(p.needsKey ? p.model : p.id === 'ollama', p.id);
  }
  assert.ok(!PROVIDERS.some(p => /anthropic|openai$/.test(p.id)), 'no paid-only providers');
});
