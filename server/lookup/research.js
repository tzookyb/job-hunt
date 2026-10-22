// Company-research sites: where to search, what a real company page looks like, and how to clean its URL.
import { searchFor } from './search.js';
import { toOverview } from './glassdoor.js';

const SEG = `[^/"'&\\s<>?#]+`;
const re = pattern => new RegExp(pattern, 'gi');

export const SITES = [
  { field: 'glassdoorUrl', domain: 'glassdoor.com', re: re(`https?://(?:www\\.)?glassdoor\\.[a-z.]+/(?:Overview|Reviews|Salary|Salaries|Interview|Benefits|Photos|Jobs)/${SEG}`), clean: toOverview },
  { field: 'linkedinUrl', domain: 'linkedin.com', hint: 'company', re: re(`https?://(?:[a-z]{2,3}\\.)?linkedin\\.com/company/(${SEG})`), clean: (u, m) => `https://www.linkedin.com/company/${m[1]}/` },
  { field: 'crunchbaseUrl', domain: 'crunchbase.com', re: re(`https?://(?:www\\.)?crunchbase\\.com/organization/(${SEG})`), clean: (u, m) => `https://www.crunchbase.com/organization/${m[1]}` },
  { field: 'levelsUrl', domain: 'levels.fyi', hint: 'salaries', re: re(`https?://(?:www\\.)?levels\\.fyi/companies/(${SEG})`), clean: (u, m) => `https://www.levels.fyi/companies/${m[1]}` },
  { field: 'blindUrl', domain: 'teamblind.com', hint: 'company reviews', re: re(`https?://(?:www\\.)?teamblind\\.com/company/(${SEG})`), clean: (u, m) => `https://www.teamblind.com/company/${m[1]}` },
  { field: 'comparablyUrl', domain: 'comparably.com', re: re(`https?://(?:www\\.)?comparably\\.com/companies/(${SEG})`), clean: (u, m) => `https://www.comparably.com/companies/${m[1]}` },
];

// The first company page of `site` in `text`. Unless `anyName` is set, its path must contain the company's name
// (search results mention other companies too; the company's own website only links to itself).
export function matchSite(text, site, key, { anyName = false } = {}) {
  for (const m of text.matchAll(site.re)) {
    const url = site.clean(m[0], m);
    if (url && (anyName || url.replace(/^https?:\/\/[^/]+/, '').toLowerCase().replace(/[^a-z0-9]/g, '').includes(key.slice(0, 5)))) return url;
  }
  return '';
}

export const findOnSite = (get, name, key, site, engines) =>
  searchFor(get, `${name} ${site.hint || ''} site:${site.domain}`.replace(/\s+/g, ' '), text => matchSite(text, site, key), engines);
