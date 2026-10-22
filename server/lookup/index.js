// Naive company lookup: website, logo and research-site links from public sources, no API keys. A best guess —
// the UI only fills fields that are still empty, and the user checks the result.
//
// Research links, most reliable first: Wikidata IDs → links on the company's own website → guessed addresses on
// sites with predictable URLs → ONE DuckDuckGo search for Glassdoor if it's still missing → naive, unchecked
// addresses for sites we can't check (Crunchbase, Comparably, Blind).
// Lesson learned (see AGENTS.md): search engines answer automated searches with bot checks after the first one.
// Don't add parallel or bulk searching back.
import { httpGet } from './fetch.js';
import { norm, origin } from './names.js';
import { viaDuckDuckGo, viaGuess } from './website.js';
import { viaWikidata } from './wikidata.js';
import { findLogo } from './logo.js';
import { SITES, findOnSite } from './research.js';
import { linksFromCompanySite } from './companySite.js';
import { PROBES, NAIVE, probe } from './probes.js';

const report = (name, r, log) => {
  const lines = [`\nLookup "${name}": website ${r.website || '—'} (${r.source || 'not found'}), logo ${r.logo ? 'yes' : '—'}`];
  for (const s of SITES) lines.push(`  ${r.links[s.field] ? '✓' : '✗'} ${s.field.replace(/Url$/, '').padEnd(10)} ${r.links[s.field] || ''}  [${r.log[s.field]}]`);
  log(lines.join('\n'));
};

// `get` is injectable so tests can run the whole lookup against canned responses.
export function createLookup({ get = httpGet, log = console.log } = {}) {
  return async function lookup(name) {
    const key = norm(name);
    const links = {}, notes = Object.fromEntries(SITES.map(s => [s.field, 'not found']));
    const add = (found, note) => { for (const [f, url] of Object.entries(found)) if (url && !links[f]) { links[f] = url; notes[f] = note; } };

    const [ddg, wd, guess] = await Promise.all([viaDuckDuckGo(get, name, key), viaWikidata(get, name, key), viaGuess(get, name, key)]);
    add(wd.links, 'wikidata');

    const site = ddg || wd.website || guess?.url;
    const website = site ? origin(site) : '';
    let logo = '';
    if (website) {
      const home = guess && guess.url && origin(guess.url) === website ? { status: 200, body: guess.html } : await get(website, { max: 600_000 });
      const homeHtml = home?.status === 200 ? home.body : '';
      const [own, icon] = await Promise.all([linksFromCompanySite(get, website, homeHtml), findLogo(get, website, homeHtml)]);
      add(own.links, 'company website');
      logo = icon;
    }

    for (const p of PROBES) {
      if (links[p.field]) continue;
      const r = await probe(get, name, key, p);
      if (r.url) add({ [p.field]: r.url }, r.note); else notes[p.field] = r.note;
    }

    if (!links.glassdoorUrl) {
      const r = await findOnSite(get, name, key, SITES.find(s => s.field === 'glassdoorUrl'), ['duckduckgo']);
      if (r.url) add({ glassdoorUrl: r.url }, 'search: ' + r.note); else notes.glassdoorUrl = r.note;
    }

    for (const n of NAIVE) if (!links[n.field]) add({ [n.field]: n.url(name) }, 'naive address (not checked)');

    const result = { website, logo, links, source: ddg ? 'duckduckgo' : wd.website ? 'wikidata' : guess ? 'guess' : '', log: notes };
    report(name, result, log);
    return result;
  };
}
