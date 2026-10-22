// Small pure helpers shared across the app.

export const uid = () => Math.random().toString(36).slice(2, 10);

const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ENTITIES[c]);

// "example.com" → "https://example.com"; leaves full URLs alone.
export const href = u => !u ? '' : /^https?:\/\//i.test(u) ? u : 'https://' + u;

// Local date as YYYY-MM-DD.
export function today(now = new Date()) {
  const d = new Date(now);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
