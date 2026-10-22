// Naive company lookup: website, logo and research-site links from public sources. A best guess — the UI only
// fills fields that are still empty, and the user checks the result.
//
// Lessons learned (see AGENTS.md): search engines answer automated searches with bot checks after the first one,
// so research links come from Wikidata IDs, and only ONE search is made per lookup (Glassdoor, when Wikidata has
// no Glassdoor ID). Don't add parallel or bulk searching back.
import { httpGet } from './fetch.js';
import { norm, origin } from './names.js';
import { viaDuckDuckGo, viaGuess } from './website.js';
import { viaWikidata } from './wikidata.js';
import { findLogo } from './logo.js';
import { SITES, findOnSite } from './research.js';

const report = (name, r, log) => {
  const lines = [`\nLookup "${name}": website ${r.website || '—'} (${r.source || 'not found'}), logo ${r.logo ? 'yes' : '—'}`];
  for (const s of SITES) lines.push(`  ${r.links[s.field] ? '✓' : '✗'} ${s.field.replace(/Url$/, '').padEnd(10)} ${r.links[s.field] || ''}  [${r.log[s.field]}]`);
  log(lines.join('\n'));
};

// `get` is injectable so tests can run the whole lookup against canned responses.
export function createLookup({ get = httpGet, log = console.log } = {}) {
  return async function lookup(name) {
    const key = norm(name);
    const [ddg, wd, guess] = await Promise.all([viaDuckDuckGo(get, name, key), viaWikidata(get, name, key), viaGuess(get, name, key)]);
    const links = { ...wd.links };
    const notes = Object.fromEntries(SITES.map(s => [s.field, links[s.field] ? 'wikidata' : 'not in Wikidata']));
    if (!links.glassdoorUrl) {
      const glassdoor = SITES.find(s => s.field === 'glassdoorUrl');
      const r = await findOnSite(get, name, key, glassdoor, ['duckduckgo']);
      if (r.url) links.glassdoorUrl = r.url;
      notes.glassdoorUrl = r.note;
    }
    const site = ddg || wd.website || guess?.url;
    const website = site ? origin(site) : '';
    const logo = website ? await findLogo(get, website, !ddg && !wd.website && guess ? guess.html : '') : '';
    const result = { website, logo, links, source: ddg ? 'duckduckgo' : wd.website ? 'wikidata' : guess ? 'guess' : '', log: notes };
    report(name, result, log);
    return result;
  };
}
