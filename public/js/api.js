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
