// Comparing company names with domains.

// "Monday.com Ltd" → "mondaycomltd"
export const norm = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
export const hostOf = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
export const origin = u => { try { return new URL(u).origin; } catch { return ''; } };

// Sites that are about companies, not the company's own site. Matched against the whole hostname, so that
// "x.com" doesn't match "wix.com".
const NOT_COMPANY_SITE = /(^|\.)(wikipedia\.org|wikidata\.org|linkedin\.com|facebook\.com|twitter\.com|x\.com|crunchbase\.com|glassdoor\.[a-z.]+|instagram\.com|youtube\.com|github\.com|bloomberg\.com|duckduckgo\.com)$/i;

// A domain is a plausible company site when it looks like the name (shared first letters).
export function plausible(url, key) {
  const host = hostOf(url);
  const label = norm(host.split('.').slice(0, -1).join(''));
  return !!label && !NOT_COMPANY_SITE.test(host) && (label.includes(key.slice(0, 5)) || key.includes(label));
}
