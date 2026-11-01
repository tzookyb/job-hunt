import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { inspect } from 'node:util';
import { createSecrets, hint, scrub, ENV_VAR } from '../../server/ai/secrets.js';
import { tempDir } from '../helpers.js';

const KEY = 'sk-test-0123456789abcdefWXYZ';

// Splits a `security -i` line the way the real tool does: whitespace, "…" with \ escapes.
function tokenize(line) {
  const out = []; let cur = null, q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) { if (c === '\\') cur += line[++i]; else if (c === '"') q = false; else cur += c; }
    else if (c === '"') { q = true; cur ??= ''; }
    else if (/\s/.test(c)) { if (cur !== null) out.push(cur); cur = null; }
    else cur = (cur ?? '') + c;
  }
  if (cur !== null) out.push(cur);
  return out;
}

// A fake /usr/bin/security backed by a Map, recording every call.
function fakeKeychain({ refuse = false } = {}) {
  const items = new Map(), calls = [];
  const opt = (a, f) => a[a.indexOf(f) + 1];
  const run = async (args, input = '') => {
    calls.push({ args, input });
    let a = args;
    if (args[0] === '-i') { if (refuse) return { code: 0, stdout: '' }; a = tokenize(input); }
    const id = opt(a, '-s') + '/' + opt(a, '-a');
    switch (a[0]) {
      case 'add-generic-password': items.set(id, opt(a, '-w')); return { code: 0, stdout: '' };
      case 'find-generic-password': return items.has(id) ? { code: 0, stdout: items.get(id) + '\n' } : { code: 44, stdout: '' };
      case 'delete-generic-password': return items.delete(id) ? { code: 0, stdout: '' } : { code: 44, stdout: '' };
      default: return { code: 1, stdout: '' };
    }
  };
  return { items, calls, run };
}

async function setup(opts = {}) {
  const dir = await tempDir();
  const file = path.join(dir, 'secrets.json');
  const logs = [];
  const kc = fakeKeychain(opts);
  const secrets = createSecrets({ file, env: opts.env || {}, platform: opts.platform || 'darwin', run: kc.run, log: m => logs.push(m) });
  return { dir, file, logs, kc, secrets };
}

const exists = f => fs.access(f).then(() => true, () => false);

test('on macOS the key goes to the Keychain over stdin, never on the command line', async () => {
  const { file, kc, secrets } = await setup();
  assert.equal(await secrets.set('groq', KEY), 'keychain');
  assert.equal(kc.items.get('job-hunt/groq'), KEY);
  for (const c of kc.calls) assert.ok(!c.args.join(' ').includes(KEY), 'key in argv: ' + c.args.join(' '));
  assert.ok(kc.calls.some(c => c.args[0] === '-i' && c.input.includes(KEY)));
  assert.equal(await exists(file), false);
  assert.equal(await secrets.get('groq'), KEY);
  assert.deepEqual(await secrets.info('groq'), { hasKey: true, keyHint: '…WXYZ', keySource: 'keychain' });
});

test('quotes and backslashes in a key survive the trip through `security -i`', async () => {
  const { kc, secrets } = await setup();
  const odd = 'ab"c\\d"; delete-generic-password -s job-hunt';
  await secrets.set('openai', odd.replace(/ /g, '_'));
  assert.equal(kc.items.get('job-hunt/openai'), odd.replace(/ /g, '_'));
});

test('keys are per provider, cached, and removable', async () => {
  const { kc, secrets } = await setup();
  await secrets.set('groq', KEY);
  await secrets.set('openai', 'sk-other-key-000000');
  assert.equal(await secrets.get('openai'), 'sk-other-key-000000');
  const before = kc.calls.length;
  await secrets.get('groq'); await secrets.get('groq');
  assert.ok(kc.calls.length - before <= 1, 'reads are cached');
  await secrets.remove('groq');
  assert.equal(kc.items.has('job-hunt/groq'), false);
  assert.deepEqual(await secrets.info('groq'), { hasKey: false, keyHint: '', keySource: '' });
  assert.equal(await secrets.get('openai'), 'sk-other-key-000000');
  await secrets.remove('groq');   // removing twice is fine
});

test('off macOS (or when the Keychain refuses) the key goes to an owner-only file', async () => {
  for (const opts of [{ platform: 'linux' }, { refuse: true }]) {
    const { file, logs, secrets } = await setup(opts);
    assert.equal(await secrets.set('groq', KEY), 'file');
    assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
    assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), { groq: KEY });
    assert.deepEqual(await secrets.info('groq'), { hasKey: true, keyHint: '…WXYZ', keySource: 'file' });
    await secrets.remove('groq');
    assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), {});
    assert.equal(logs.length, opts.refuse ? 1 : 0);
    for (const m of logs) assert.ok(!m.includes(KEY));
  }
});

test('an existing file is tightened to 0600 on the next save', async () => {
  const { file, secrets } = await setup({ platform: 'linux' });
  await fs.writeFile(file, '{}', { mode: 0o644 });
  await secrets.set('openai', KEY);
  assert.equal((await fs.stat(file)).mode & 0o777, 0o600);
});

test('saving to the Keychain clears an older copy in the file', async () => {
  const { file, secrets } = await setup();
  await fs.writeFile(file, JSON.stringify({ groq: 'sk-old-key-11111111' }));
  await secrets.set('groq', KEY);
  assert.deepEqual(JSON.parse(await fs.readFile(file, 'utf8')), {});
});

test('the environment variable wins over anything stored', async () => {
  const { secrets } = await setup({ env: { [ENV_VAR]: 'sk-from-env-9999999999' } });
  await secrets.set('groq', KEY);
  assert.equal(await secrets.get('groq'), 'sk-from-env-9999999999');
  assert.equal((await secrets.info('groq')).keySource, 'env');
});

test('bad providers and keys are refused without echoing them', async () => {
  const { secrets } = await setup();
  for (const p of ['', 'Groq', '../x', 'a b', 'x'.repeat(41)]) {
    await assert.rejects(secrets.get(p), { status: 400 });
    await assert.rejects(secrets.set(p, KEY), e => e.status === 400 && !e.message.includes(KEY));
  }
  for (const k of ['', 'short', 'has space inside', 'tab\there12345', 'new\nline12345', 'ünïcode-key-1234']) {
    await assert.rejects(secrets.set('openai', k), e => e.status === 400 && (!k || !e.message.includes(k)));
  }
  assert.equal((await secrets.info('openai')).hasKey, false);
});

test('the secrets object has nothing to print or serialize', async () => {
  const { secrets } = await setup();
  await secrets.set('groq', KEY);
  assert.ok(!JSON.stringify(secrets).includes(KEY));
  assert.ok(!inspect(secrets, { depth: 5, showHidden: true }).includes(KEY));
});

test('hint shows at most the last 4 characters, and nothing for short keys', () => {
  assert.equal(hint(''), '');
  assert.equal(hint('sk-1234567'), '…');
  assert.equal(hint(KEY), '…WXYZ');
});

test('scrub hides every copy of each secret', () => {
  assert.equal(scrub(`401: invalid key ${KEY} (${KEY})`, KEY), '401: invalid key [key] ([key])');
  assert.equal(scrub('nothing here', KEY, ''), 'nothing here');
  assert.equal(scrub(undefined, KEY), '');
});
