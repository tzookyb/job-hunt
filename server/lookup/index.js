// Naive company lookup: website, logo and Glassdoor from public sources. A best guess — the UI only fills
// fields that are still empty, and the user checks the result.
import { httpGet } from './fetch.js';
import { norm, origin } from './names.js';
import { viaDuckDuckGo, viaWikidata, viaGuess } from './website.js';
import { findLogo } from './logo.js';
import { findGlassdoor } from './glassdoor.js';

// `get` is injectable so tests can run the whole lookup against canned responses.
export function createLookup({ get = httpGet, log = console.log } = {}) {
  return async function lookup(name) {
    const key = norm(name);
    const [ddg, wd, guess, glassdoorUrl] = await Promise.all([
      viaDuckDuckGo(get, name, key), viaWikidata(get, name, key), viaGuess(get, name, key), findGlassdoor(get, name, key),
    ]);
    const site = ddg || wd || guess?.url;
    const website = site ? origin(site) : '';
    const logo = website ? await findLogo(get, website, !ddg && !wd && guess ? guess.html : '') : '';
    const source = ddg ? 'duckduckgo' : wd ? 'wikidata' : guess ? 'guess' : '';
    log(`Lookup "${name}": website ${website || '—'} (${source || 'not found'}), logo ${logo ? 'yes' : '—'}, Glassdoor ${glassdoorUrl ? 'yes' : '—'}`);
    return { website, logo, glassdoorUrl, source };
  };
}
