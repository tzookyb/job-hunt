// API keys for the AI lookup. A key is written here once and read back only by the server: it never goes back to
// the browser (callers get `info()`: hasKey + the last 4 characters), never into data.json (so never into backups),
// and never into a log line or an error message.
//
// Where a key lives, first match wins:
//   1. the JOB_HUNT_AI_KEY environment variable (read-only; set it yourself before `npm start`);
//   2. the macOS Keychain, through the built-in `security` tool. The key goes over stdin to `security -i`, never on
//      the command line, where any local process could read it with `ps`;
//   3. user-data/secrets.json, readable by the owner only (mode 0600). Used off macOS or when the Keychain refuses.
// One key per provider ("gemini", "groq", …), so switching providers doesn't throw a key away.
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

export const ENV_VAR = 'JOB_HUNT_AI_KEY';
export const SERVICE = 'job-hunt';
const SECURITY = '/usr/bin/security';
const NOT_FOUND = 44;   // `security` exit code when the Keychain has no such item

const PROVIDER = /^[a-z0-9][a-z0-9-]{0,39}$/;
const KEY = /^[\x21-\x7e]{8,1024}$/;   // printable ASCII, no spaces: every provider's keys look like this

export function checkProvider(provider) {
  if (!PROVIDER.test(String(provider))) throw Object.assign(new Error('Unknown provider'), { status: 400 });
}

function checkKey(key) {
  if (!KEY.test(String(key))) throw Object.assign(new Error('That doesn\'t look like an API key'), { status: 400 });
}

// "…abcd" for a key long enough that showing 4 characters gives little away; just "…" otherwise.
export function hint(key) {
  return key ? (key.length >= 16 ? '…' + key.slice(-4) : '…') : '';
}

// Replaces every secret in `text` with [key]. Use on anything printed or returned that may echo a key back
// (provider error messages, failed `security` output).
export function scrub(text, ...secrets) {
  let s = String(text ?? '');
  for (const x of secrets) if (x && x.length >= 4) s = s.split(x).join('[key]');
  return s;
}

// Quotes a value for `security -i`, which splits its input line on whitespace and understands "…" with \ escapes.
const quote = s => '"' + String(s).replace(/[\\"]/g, c => '\\' + c) + '"';

// Runs /usr/bin/security; resolves { code, stdout } and never rejects (a failure is a non-zero code).
// stderr is dropped: it's never shown, so it can't leak anything.
function runSecurity(args, input) {
  return new Promise(resolve => {
    const child = execFile(SECURITY, args, { timeout: 10e3 }, (err, stdout) =>
      resolve({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, stdout: String(stdout) }));
    child.on('error', () => {});
    child.stdin.on('error', () => {});
    child.stdin.end(input ?? '');
  });
}

function keychain(run) {
  return {
    async get(provider) {
      const r = await run(['find-generic-password', '-s', SERVICE, '-a', provider, '-w']);
      return r.code === 0 ? r.stdout.replace(/\r?\n$/, '') : '';
    },
    async set(provider, key) {
      const line = `add-generic-password -U -s ${quote(SERVICE)} -a ${quote(provider)} -w ${quote(key)}\n`;
      if ((await run(['-i'], line)).code !== 0) return false;
      return (await this.get(provider)) === key;   // `security -i` can exit 0 after a failed command: check
    },
    async remove(provider) {
      const r = await run(['delete-generic-password', '-s', SERVICE, '-a', provider]);
      return r.code === 0 || r.code === NOT_FOUND;
    },
  };
}

function secretsFile(file) {
  const read = async () => {
    try { const d = JSON.parse(await fs.readFile(file, 'utf8')); return d && typeof d === 'object' ? d : {}; }
    catch { return {}; }
  };
  const write = async d => {
    await fs.mkdir(path.dirname(file), { recursive: true });
    const tmp = file + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(d, null, 2) + '\n', { mode: 0o600 });
    await fs.chmod(tmp, 0o600);   // writeFile's mode only applies to new files
    await fs.rename(tmp, file);
  };
  return {
    async get(provider) { const v = (await read())[provider]; return typeof v === 'string' ? v : ''; },
    async set(provider, key) { await write({ ...(await read()), [provider]: key }); return true; },
    async remove(provider) {
      const d = await read();
      if (!(provider in d)) return true;
      delete d[provider];
      await write(d);
      return true;
    },
  };
}

// createSecrets({ file }) → { get, set, remove, info }. Tests inject `env`, `platform` and a fake `run`.
// Everything lives in this closure, so the returned object has nothing to print or serialize.
export function createSecrets({ file, env = process.env, platform = process.platform, run = runSecurity, log = console.warn }) {
  const disk = secretsFile(file);
  const chain = platform === 'darwin' ? keychain(run) : null;
  const cache = new Map();   // provider → { key, source }; saves spawning `security` on every request

  async function lookup(provider) {
    checkProvider(provider);
    if (env[ENV_VAR]) return { key: env[ENV_VAR], source: 'env' };
    if (cache.has(provider)) return cache.get(provider);
    let found = { key: '', source: '' };
    const fromChain = chain && await chain.get(provider);
    if (fromChain) found = { key: fromChain, source: 'keychain' };
    else { const fromFile = await disk.get(provider); if (fromFile) found = { key: fromFile, source: 'file' }; }
    cache.set(provider, found);
    return found;
  }

  return {
    // The key itself: only for the server's own requests to the provider.
    async get(provider) { return (await lookup(provider)).key; },

    // What the settings screen may know about a key.
    async info(provider) {
      const { key, source } = await lookup(provider);
      return { hasKey: !!key, keyHint: hint(key), keySource: source };
    },

    // Saves a key: Keychain on macOS, the 0600 file otherwise or when the Keychain refuses. Resolves the source used.
    async set(provider, key) {
      checkProvider(provider);
      key = String(key ?? '').trim();
      checkKey(key);
      cache.delete(provider);
      if (chain && await chain.set(provider, key)) {
        await disk.remove(provider);   // don't leave an older copy behind in the file
        return 'keychain';
      }
      if (chain) log('[ai] The Keychain refused the API key; saved it to user-data/secrets.json (owner-only) instead.');
      await disk.set(provider, key);
      return 'file';
    },

    // Forgets a stored key everywhere it may be (the env var is the user's own and stays).
    async remove(provider) {
      checkProvider(provider);
      cache.delete(provider);
      if (chain && !(await chain.remove(provider))) log('[ai] Couldn\'t remove the API key from the Keychain.');
      await disk.remove(provider);
    },
  };
}
