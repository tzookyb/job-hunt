import { test } from 'node:test';
import assert from 'node:assert/strict';
import { complete, ping } from '../../server/ai/providers/index.js';
import { parseJsonObject } from '../../server/ai/providers/openaiCompatible.js';
import { fakeProvider, chatReply } from './fakeProvider.js';
import { startApp, api } from '../helpers.js';

const KEY = 'sk-test-0123456789abcdefWXYZ';
const schema = { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] };
const ask = { system: 'sys', user: 'hello', schema };

test('openai-compatible: bearer key, json_object, schema in the system prompt, fenced JSON parsed', async () => {
  const fake = await fakeProvider(() => chatReply('```json\n{"ok": true}\n```'));
  try {
    assert.deepEqual(await complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm', ...ask }), { ok: true });
    const r = fake.requests[0];
    assert.equal(r.url, '/chat/completions');
    assert.equal(r.headers.authorization, `Bearer ${KEY}`);
    assert.deepEqual(r.body.response_format, { type: 'json_object' });
    assert.ok(r.body.messages[0].content.includes(JSON.stringify(schema)));
    assert.equal(r.body.max_tokens, undefined);
  } finally { await fake.close(); }
});

test('openai-compatible: no key → no Authorization header (Ollama)', async () => {
  const fake = await fakeProvider(() => chatReply('{"ok":true}'));
  try {
    await complete({ kind: 'openai', key: '', baseURL: fake.base, model: 'llama', ...ask });
    assert.equal(fake.requests[0].headers.authorization, undefined);
  } finally { await fake.close(); }
});

test('openai-compatible: a server that rejects response_format gets one retry without it', async () => {
  const fake = await fakeProvider((r, n) => n === 1 ? { status: 400, json: { error: { message: 'response_format is not supported' } } } : chatReply('Sure! {"ok": true} hope that helps'));
  try {
    assert.deepEqual(await complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm', ...ask }), { ok: true });
    assert.equal(fake.requests.length, 2);
    assert.equal(fake.requests[1].body.response_format, undefined);
  } finally { await fake.close(); }
});

test('provider errors become plain messages, with the key scrubbed', async () => {
  const cases = [
    [401, 'auth', /refused the API key/],
    [404, 'model', /Model or endpoint not found/],
    [429, 'rate', /Rate limited/],
    [500, 'provider', /had an error \(500\)/],
    [400, 'request', /said no \(400\)/],
  ];
  for (const [status, code, msg] of cases) {
    const fake = await fakeProvider(() => ({ status, json: { error: { message: `bad key ${KEY} for you` } } }));
    try {
      await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm', ...ask }),
        e => e.code === code && msg.test(e.message) && !e.message.includes(KEY) && e.message.includes('[key]'));
    } finally { await fake.close(); }
  }
});

test('bad answers, timeouts and unreachable servers are AiErrors', async () => {
  const fake = await fakeProvider(r => r.body.model === 'slow' ? { ...chatReply('{"ok":true}'), delay: 400 } : chatReply('not json at all'));
  try {
    await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm', ...ask }), { code: 'shape' });
    await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'slow', timeout: 100, ...ask }), { code: 'timeout' });
    const ac = new AbortController(); ac.abort();
    await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'slow', signal: ac.signal, ...ask }), { code: 'cancelled' });
  } finally { await fake.close(); }
  await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm', ...ask }), { code: 'network' });
  await assert.rejects(complete({ kind: 'nope', key: KEY, baseURL: fake.base, model: 'm', ...ask }), { status: 400 });
  await assert.rejects(complete({ kind: 'openai', key: KEY, baseURL: fake.base, model: '', ...ask }), { code: 'model' });
});

test('parseJsonObject finds the object and refuses non-objects', () => {
  assert.deepEqual(parseJsonObject(' {"a":1} '), { a: 1 });
  assert.deepEqual(parseJsonObject('Here:\n```json\n{"a":{"b":2}}\n```'), { a: { b: 2 } });
  for (const bad of ['[1,2]', '42', '', 'nope']) assert.throws(() => parseJsonObject(bad), { code: 'shape' });
});

test('ping sends a tiny request', async () => {
  const fake = await fakeProvider(() => chatReply('{"ok":true}'));
  try {
    const r = await ping({ kind: 'openai', key: KEY, baseURL: fake.base, model: 'm' });
    assert.equal(r.ok, true);
    assert.equal(fake.requests.length, 1);
    assert.match(fake.requests[0].body.messages[1].content, /"ok": true/);
  } finally { await fake.close(); }
});

// POST /api/settings/test, end to end through the app with a provider pointed at the fake server.
test('POST /api/settings/test reports success or a scrubbed error, never the key', async () => {
  let mode = 'ok';
  const fake = await fakeProvider(() => mode === 'ok' ? chatReply('{"ok":true}') : { status: 401, json: { error: { message: `Incorrect API key provided: ${KEY}` } } });
  const providers = [{ id: 'fake', label: 'Fake', kind: 'openai', needsKey: true, baseURL: fake.base, model: 'local-model', free: 'x', keyUrl: 'https://x.example', keyLink: 'x', steps: ['a', 'b'] }];
  const app = await startApp({}, { providers });
  const put = body => api(`${app.base}/api/settings`, { method: 'PUT', body: JSON.stringify(body) });
  const test = async () => { const r = await api(`${app.base}/api/settings/test`, { method: 'POST' }); assert.equal(r.status, 200); const t = await r.text(); assert.ok(!t.includes(KEY)); return JSON.parse(t); };
  try {
    assert.deepEqual(await test(), { ok: false, error: 'Pick a provider first' });
    await put({ provider: 'fake' });
    assert.deepEqual(await test(), { ok: false, error: 'Save an API key first' });

    await put({ apiKey: KEY });
    let r = await test();
    assert.equal(r.ok, true);
    assert.equal(r.model, 'local-model');
    assert.equal(fake.requests.at(-1).headers.authorization, `Bearer ${KEY}`);

    mode = 'refuse';
    r = await test();
    assert.equal(r.ok, false);
    assert.match(r.error, /refused the API key/);
    assert.match(r.error, /\[key\]/);
    assert.equal((await fetch(`${app.base}/api/settings/test`, { method: 'POST' })).status, 403);   // guard
  } finally { await app.close(); await fake.close(); }
});

test('an empty model falls back to the preset default', async () => {
  const app = await startApp();
  try {
    const s = await (await api(`${app.base}/api/settings`, { method: 'PUT', body: JSON.stringify({ provider: 'gemini', model: '' }) })).json();
    assert.equal(s.providers.find(p => p.id === 'gemini').model, 'gemini-3.5-flash-lite');
    const { createSettings } = await import('../../server/ai/settings.js');
    const settings = createSettings({ file: `${app.config.dataDir}/settings.json`, secrets: app.deps.secrets });
    const r = await settings.resolve();
    assert.equal(r.model, 'gemini-3.5-flash-lite');
    assert.equal(r.baseURL, 'https://generativelanguage.googleapis.com/v1beta/openai');
    assert.equal(r.kind, 'openai');
  } finally { await app.close(); }
});
