// Free-text search: every word must appear somewhere in the company's text.

import { RESEARCH } from '../config.js';

export function searchText(c) {
  return [c.name, c.website, c.careersUrl, ...RESEARCH.map(r => c[r.field]), c.position, c.comments, c.closeReason,
    ...(c.contacts || []).flatMap(x => [x.name, x.role, x.phone, x.linkedin]),
    ...Object.values(c.stages).map(s => s.comment),
    ...c.notes.flatMap(n => [n.title, n.body]),
    c.action?.text, ...(c.actionLog || []).map(x => x.text)].join(' ').toLowerCase();
}

export function matches(c, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = searchText(c);
  return words.every(w => hay.includes(w));
}
