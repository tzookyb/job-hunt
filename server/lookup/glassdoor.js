// Glassdoor links always point at the company's Overview ("About") tab.
const TAB_SUFFIX = /-(Reviews|Interview-Questions|Interviews|Salaries|Salary|Benefits|Photos|Jobs|Office-Photos)$/i;

// Any Glassdoor company page (Reviews, Salaries, Interviews…, any country domain) → its Overview tab.
export function toOverview(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (/^\/Overview\//i.test(u.pathname)) return 'https://www.glassdoor.com' + u.pathname;
  const m = u.pathname.match(/\/([^/]+?)-E(\d+)(?:[_.-][^/]*)?$/);   // e.g. /Reviews/Acme-Reviews-E380463.htm
  if (!m) return null;
  const slug = m[1].replace(TAB_SUFFIX, '');
  const prefix = 'Working-at-';
  return `https://www.glassdoor.com/Overview/${prefix}${slug}-EI_IE${m[2]}.${prefix.length},${prefix.length + slug.length}.htm`;
}
