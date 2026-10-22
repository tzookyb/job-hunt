// Talks to the local server.

export async function getData() {
  const r = await fetch('/api/data', { cache: 'no-store' });
  if (!r.ok) throw new Error('Server error ' + r.status);
  return r.json();
}

export async function putData(body) {
  const r = await fetch('/api/data', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
  if (!r.ok) throw new Error('Save failed ' + r.status);
}

// Naive company lookup on the server. Resolves { website, logo, glassdoorUrl } or { error }.
export async function lookup(name, signal) {
  try {
    const r = await fetch('/api/lookup?name=' + encodeURIComponent(name), { signal, cache: 'no-store' });
    if (!r.ok) return { error: r.status === 404 ? 'Restart the server to enable lookup' : 'Lookup failed' };
    return await r.json();
  } catch { return { error: signal?.aborted ? 'Skipped' : 'Lookup failed' }; }
}

// "Back up now" → the new backup's file name.
export async function backup() {
  const r = await fetch('/api/backup', { method: 'POST' });
  if (r.status === 404) throw new Error('restart the server');
  if (!r.ok) throw new Error(await r.text());
  return (await r.json()).name;
}
