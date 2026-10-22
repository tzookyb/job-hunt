// The company's Glassdoor page, found through a site: search and always pointing at its Overview ("About") tab.
import { searchFor } from './search.js';

const GLASSDOOR = /https?:\/\/(?:www\.)?glassdoor\.[a-z.]+\/(?:Overview|Reviews|Salary|Salaries|Interview|Benefits|Photos|Jobs)\/[^/"'&\s<>?#]+/gi;
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

export const pickGlassdoor = key => text => {
  for (const [url] of text.matchAll(GLASSDOOR)) {
    const overview = toOverview(url);
    if (overview && overview.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key.slice(0, 5))) return overview;
  }
  return '';
};

export const findGlassdoor = (get, name, key) => searchFor(get, `${name} site:glassdoor.com`, pickGlassdoor(key));
