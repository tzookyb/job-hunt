// Talks to the local server. Every API call carries X-Job-Hunt: 1, or the server refuses it (server/guard.js).

const H = { 'X-Job-Hunt': '1' };

export async function getData() {
  const r = await fetch('/api/data', { headers: H, cache: 'no-store' });
  if (!r.ok) throw new Error(r.status === 403 ? 'Refresh the page' : 'Server error ' + r.status);
  return r.json();
}

export async function putData(body) {
  const r = await fetch('/api/data', { method: 'PUT', headers: { ...H, 'Content-Type': 'application/json' }, body });
  if (!r.ok) throw new Error('Save failed ' + r.status);
}

// Naive company lookup on the server. Resolves { website, logo, glassdoorUrl } or { error }.
export async function lookup(name, signal) {
  try {
    const r = await fetch('/api/lookup?name=' + encodeURIComponent(name), { headers: H, signal, cache: 'no-store' });
    if (!r.ok) return { error: r.status === 404 ? 'Restart the server to enable lookup' : 'Lookup failed' };
    return await r.json();
  } catch { return { error: signal?.aborted ? 'Skipped' : 'Lookup failed' }; }
}

// "Back up now" → the new backup's file name.
export async function backup() {
  const r = await fetch('/api/backup', { method: 'POST', headers: H });
  if (r.status === 404) throw new Error('restart the server');
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).name;
}

// Uploads a CV file as-is → { file, size } (the stored name is a hash of the content; see server/cvs.js).
export async function uploadCv(file) {
  const r = await fetch('/api/cvs?name=' + encodeURIComponent(file.name), {
    method: 'POST', headers: { ...H, 'Content-Type': file.type || 'application/octet-stream' }, body: file,
  });
  if (r.status === 404) throw new Error('Restart the server to enable CV uploads');
  if (!r.ok) throw new Error(r.status === 413 ? 'File too large (15 MB max)' : await r.text());
  return r.json();
}

// AI settings (server/ai/routes.js). The key goes up once; only hasKey / keyHint / keySource ever come back.
async function jsonCall(url, method = 'GET', body) {
  const r = await fetch(url, {
    method, cache: 'no-store',
    headers: body === undefined ? H : { ...H, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (r.status === 404) throw new Error('Restart the server to enable AI settings');
  if (!r.ok) throw new Error(r.status === 403 ? 'Refresh the page' : await r.text());
  return r.json();
}
export const getSettings = () => jsonCall('/api/settings');
export const putSettings = body => jsonCall('/api/settings', 'PUT', body);
export const getProfile = async () => (await jsonCall('/api/profile')).text;
export const putProfile = text => jsonCall('/api/profile', 'PUT', { text });
export const testSettings = () => jsonCall('/api/settings/test', 'POST', {});

// The AI lookup with the company's current fields. Resolves the same shape as lookup() plus `ai` / `aiError`,
// or { off: message } when no provider/key is set up (then the caller falls back to the plain lookup), or { error }.
export async function aiLookup(body, signal) {
  try {
    const r = await fetch('/api/ai/lookup', { method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal, cache: 'no-store' });
    if (r.status === 409) return { off: await r.text() };
    if (r.status === 404) return { off: 'Restart the server to enable the AI lookup' };
    if (!r.ok) return { error: r.status === 403 ? 'Refresh the page' : await r.text() || 'Lookup failed' };
    return await r.json();
  } catch { return { error: signal?.aborted ? 'Skipped' : 'Lookup failed' }; }
}
