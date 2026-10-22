// "Research" on the company page: links to the company on review, salary and funding sites. Hovering a site's name
// explains what it's for; an empty field's 🔍 opens a Google search for the company on that site.
import { esc, href } from '../util.js';
import { RESEARCH } from '../config.js';
import { on } from '../bus.js';

const siteSearch = (c, domain) => 'https://www.google.com/search?q=' + encodeURIComponent(`${c.name || ''} site:${domain}`);

function setLink(a, c, { field, domain }) {
  const value = c[field];
  a.href = value ? href(value) : siteSearch(c, domain);
  a.textContent = value ? '↗' : '🔍';
  a.title = value ? 'Open' : 'Not set: search for it';
  a.classList.remove('hidden');
}

const cellHtml = (c, site) => `<label><span class="pname" data-tip="${esc(site.tip)}">${esc(site.label)}</span><div class="lc">
    <input data-f="${site.field}" value="${esc(c[site.field])}" placeholder="${esc(site.domain.split('/')[0])}/…">
    <a class="go" data-research="${site.field}" target="_blank" rel="noopener"></a></div></label>`;

export function researchHtml(c) {
  return `<h2>Research</h2><div class="grid research">${RESEARCH.map(s => cellHtml(c, s)).join('')}</div>`;
}

// Fill in the links after rendering (and keep them in sync while typing).
export function syncResearchLinks(root, c) {
  for (const site of RESEARCH) {
    const a = root.querySelector(`a[data-research="${site.field}"]`);
    if (a) setLink(a, c, site);
  }
}

export function init() {
  on('field', ({ c, el }) => {
    const host = el.closest('.detail');
    if (host && (el.dataset.f === 'name' || RESEARCH.some(s => s.field === el.dataset.f))) syncResearchLinks(host, c);
  });
}
