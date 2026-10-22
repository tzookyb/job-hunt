// Research links from the company's own website. Most sites link their LinkedIn page (and sometimes Glassdoor,
// Crunchbase or Indeed) in the footer or on About / Careers pages. It's the company's own site, so there are no bot
// checks, and its links can be trusted to be about this company.
import { SITES, matchSite } from './research.js';

const EXTRA_PAGES = ['/about', '/careers', '/company'];

// Links in inline JSON are often escaped ("https:\/\/www.linkedin.com\/company\/…").
const unescape = html => html.replace(/\\\//g, '/').replace(/&amp;/g, '&');

export async function linksFromCompanySite(get, website, homeHtml = '') {
  const pages = await Promise.all(EXTRA_PAGES.map(p => get(website + p, { timeout: 5000, max: 600_000 })));
  const texts = [homeHtml, ...pages.filter(r => r?.status === 200 && /html/i.test(r.type)).map(r => r.body)].map(unescape);
  const links = {};
  for (const site of SITES) {
    for (const text of texts) {
      const url = matchSite(text, site, '', { anyName: true });
      if (url) { links[site.field] = url; break; }
    }
  }
  return { links, pagesRead: texts.filter(Boolean).length };
}
