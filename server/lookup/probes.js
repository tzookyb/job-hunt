// Sites whose company pages have predictable addresses: try a few spellings of the name and keep a page only if it
// loads and its title names the company. One site at a time, a handful of requests — never bulk.
import { norm } from './names.js';

export const PROBES = [
  { field: 'finderUrl', url: slug => `https://finder.startupnationcentral.org/company_page/${slug}` },
  { field: 'levelsUrl', url: slug => `https://www.levels.fyi/companies/${slug}` },
  { field: 'comparablyUrl', url: slug => `https://www.comparably.com/companies/${slug}` },
];

// "Monday.com Ltd" → ["monday-com-ltd", "mondaycomltd", "monday"]
export function slugs(name) {
  const words = String(name).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim().split(' ').filter(Boolean);
  return [...new Set([words.join('-'), words.join(''), words[0]].filter(Boolean))];
}

const NOT_FOUND = /(page not found|404|doesn['’]t exist|no longer available|an unknown error occurred)/i;

// A real company page: 200, HTML, and a title (or og:title) that contains the name.
export function looksLikeCompanyPage(r, key) {
  if (!r || r.status !== 200 || !/html/i.test(r.type)) return false;
  const head = r.body.slice(0, 60_000);
  const title = [(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1], (head.match(/og:title["'][^>]*content=["']([^"']+)/i) || [])[1]].join(' ');
  return norm(title).includes(key) && !NOT_FOUND.test(title);
}

// → { url, note }
export async function probe(get, name, key, p) {
  const tried = [];
  for (const slug of slugs(name)) {
    const r = await get(p.url(slug), { timeout: 6000, max: 400_000 });
    tried.push(`${slug}: ${r ? r.status : 'no response'}`);
    if (looksLikeCompanyPage(r, key)) return { url: r.url, note: `guessed address (${slug})` };
    if (r && [403, 429, 999].includes(r.status)) break;   // the site blocks automated visits: stop asking
  }
  return { url: '', note: `guess failed (${tried.join(', ')})` };
}
