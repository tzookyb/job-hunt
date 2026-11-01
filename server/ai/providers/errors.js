// Errors from talking to a provider. `message` is always safe to show and log: it's ours, or the provider's own
// message with any key scrubbed out and cut short.
import { scrub } from '../secrets.js';

export class AiError extends Error {
  constructor(message, { status = 502, code = 'provider' } = {}) { super(message); this.status = status; this.code = code; }
}

// Turns a non-2xx provider response into an AiError with a plain-English message.
export async function fromResponse(res, key) {
  let detail = '';
  try {
    const text = await res.text();
    try { const j = JSON.parse(text); detail = j?.error?.message || (typeof j?.error === 'string' ? j.error : '') || j?.message || ''; }
    catch { detail = text; }
  } catch {}
  detail = scrub(String(detail).replace(/\s+/g, ' ').trim(), key).slice(0, 240);
  const said = detail ? ` (${detail})` : '';
  const s = res.status;
  if (s === 401 || s === 403) return new AiError('The provider refused the API key' + said, { code: 'auth' });
  if (s === 404) return new AiError('Model or endpoint not found — check the model name' + said, { code: 'model' });
  if (s === 429) return new AiError('Rate limited or out of credit — try again later' + said, { code: 'rate' });
  if (s >= 500) return new AiError(`The provider had an error (${s})` + said);
  return new AiError(`The provider said no (${s})` + said, { code: s === 400 ? 'request' : 'provider' });
}

// fetch() with a timeout and friendly network errors. Never puts the URL's secrets anywhere (there are none: keys
// go in headers).
// Either signal aborting aborts the request (AbortSignal.any is Node ≥ 20.3; the app supports Node 18).
function either(a, b) {
  if (!b) return a;
  if (AbortSignal.any) return AbortSignal.any([a, b]);
  const c = new AbortController();
  for (const s of [a, b]) { if (s.aborted) c.abort(s.reason); else s.addEventListener('abort', () => c.abort(s.reason), { once: true }); }
  return c.signal;
}

export async function post(fetchFn, url, { headers, body, signal, timeout }) {
  try {
    return await fetchFn(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body), signal: either(AbortSignal.timeout(timeout), signal) });
  } catch (e) {
    if (signal?.aborted) throw new AiError('Cancelled', { status: 499, code: 'cancelled' });
    if (e.name === 'TimeoutError') throw new AiError(`The provider didn't answer within ${Math.round(timeout / 1000)}s`, { code: 'timeout' });
    throw new AiError(`Couldn't reach ${new URL(url).host}` + (new URL(url).hostname === 'localhost' ? ' — is it running?' : ''), { code: 'network' });
  }
}
