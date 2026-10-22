// Finding a company's official website, from the most to the least reliable source.
import { BOT_UA } from './fetch.js';
import { norm, plausible } from './names.js';

// DuckDuckGo's Instant Answer API (an infobox "website" or the first results).
export async function viaDuckDuckGo(get, name, key) {
  const r = await get('https://api.duckduckgo.com/?format=json&no_html=1&skip_disambig=1&q=' + encodeURIComponent(name), { ua: BOT_UA });
  try {
    const j = JSON.parse(r.body);
    const box = (j.Infobox?.content || []).find(x => /official_website|website/i.test(x.data_type + ' ' + x.label));
    return [box?.value, ...(j.Results || []).map(x => x.FirstURL)].filter(Boolean).find(u => plausible(u, key)) || null;
  } catch { return null; }
}

// Wikidata's "official website" (P856) on the best matching entity.
export async function viaWikidata(get, name, key) {
  try {
    const s = await get('https://www.wikidata.org/w/api.php?action=wbsearchentities&format=json&language=en&type=item&limit=5&search=' + encodeURIComponent(name), { ua: BOT_UA });
    const hits = JSON.parse(s.body).search;
    if (!hits.length) return null;
    const e = await get('https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=claims&ids=' + hits.map(x => x.id).join('|'), { ua: BOT_UA });
    const entities = JSON.parse(e.body).entities;
    for (const h of hits) {
      const site = entities[h.id]?.claims?.P856?.[0]?.mainsnak?.datavalue?.value;
      if (site && plausible(site, key)) return site;
    }
  } catch { /* nothing usable */ }
  return null;
}

const PARKED = /(for sale|buy this domain|domain is parked|parked free|godaddy|sedo\.com|dan\.com|hugedomains|afternic)/i;
const TLDS = ['com', 'io', 'ai', 'co.il', 'co', 'dev', 'app', 'tech'];

// Try name.com, name.io … and keep the first page that answers and mentions the company.
export async function viaGuess(get, name, key) {
  if (!key) return null;
  const pages = await Promise.all(TLDS.map(t => get(`https://${key}.${t}`, { timeout: 5000, max: 150_000 })));
  for (const r of pages) {
    if (!r || r.status !== 200 || !/html/i.test(r.type)) continue;
    const head = r.body.slice(0, 30_000);
    const title = (head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
    const siteName = (head.match(/og:site_name["'][^>]*content=["']([^"']+)/i) || [])[1] || '';
    if (PARKED.test(head) || !norm(title + ' ' + siteName).includes(key)) continue;
    return { url: r.url, html: r.body };
  }
  return null;
}
