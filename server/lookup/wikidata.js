// Wikidata knows many companies' official website and their IDs on research sites — no scraping, no bot checks.
import { BOT_UA } from './fetch.js';
import { norm, plausible } from './names.js';

// Wikidata property → our field + its URL pattern.
export const WD_IDS = {
  P4264: ['linkedinUrl', 'https://www.linkedin.com/company/$1/'],
  P8060: ['glassdoorUrl', 'https://www.glassdoor.com/Overview/-EI_IE$1.htm'],
  P2088: ['crunchbaseUrl', 'https://www.crunchbase.com/organization/$1'],
  P10206: ['comparablyUrl', 'https://www.comparably.com/companies/$1'],
  P10146: ['levelsUrl', 'https://www.levels.fyi/company/$1/'],
};

const API = 'https://www.wikidata.org/w/api.php?format=json&';
const value = (claims, p) => claims[p]?.[0]?.mainsnak?.datavalue?.value;

// → { website, links: { <field>: url } }. Picks the entity whose website looks like the name, or whose label is
// the name and has research IDs (so "Acme Tower" doesn't win over "Acme").
export async function viaWikidata(get, name, key) {
  const none = { website: null, links: {} };
  try {
    const s = await get(API + 'action=wbsearchentities&language=en&type=item&limit=5&search=' + encodeURIComponent(name), { ua: BOT_UA });
    const hits = JSON.parse(s.body).search;
    if (!hits.length) return none;
    const e = await get(API + 'action=wbgetentities&props=claims&ids=' + hits.map(x => x.id).join('|'), { ua: BOT_UA });
    const entities = JSON.parse(e.body).entities;
    for (const h of hits) {
      const claims = entities[h.id]?.claims || {};
      const site = value(claims, 'P856');
      const links = {};
      for (const [p, [field, pattern]] of Object.entries(WD_IDS)) {
        const id = value(claims, p);
        if (typeof id === 'string' && id) links[field] = pattern.replace('$1', id);
      }
      const label = norm(h.label);
      const sameName = label && (label === key || label.startsWith(key) || key.startsWith(label));
      if (site && plausible(site, key)) return { website: site, links };
      if (sameName && Object.keys(links).length) return { website: null, links };
    }
  } catch { /* nothing usable */ }
  return none;
}
