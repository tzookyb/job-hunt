// Free-text search: every word must appear somewhere in the company's text.

export function searchText(c) {
  return [c.name, c.website, c.careersUrl, c.glassdoorUrl, c.position, c.comments, c.closeReason,
    ...(c.contacts || []).flatMap(x => [x.name, x.role, x.phone, x.linkedin]),
    ...Object.values(c.stages).map(s => s.comment),
    ...c.notes.flatMap(n => [n.title, n.body])].join(' ').toLowerCase();
}

export function matches(c, query) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = searchText(c);
  return words.every(w => hay.includes(w));
}
