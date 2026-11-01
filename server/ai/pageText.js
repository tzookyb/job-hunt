// Plain text from web pages, for the AI to read. Small and predictable on purpose: the model gets a few KB per page,
// with scripts, styles and markup gone.

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', bull: '•' };

export function decodeEntities(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const n = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

// HTML → readable text: block elements become line breaks, list items become "- ", whitespace collapsed.
export function htmlToText(html, max = 8000) {
  let s = String(html || '')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<(br|\/p|\/div|\/h[1-6]|\/li|\/tr|\/section|\/article|\/header|\/footer|\/ul|\/ol)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  s = decodeEntities(s)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n+(?=- )/g, '\n')   // list items on consecutive lines
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return s.length > max ? s.slice(0, max).replace(/\s+\S*$/, '') + ' …' : s;
}

// The page's <title>.
export const titleOf = html => decodeEntities((String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').replace(/\s+/g, ' ').trim();

// A JobPosting in the page's JSON-LD, which many job boards include for search engines even when the visible page
// is built by JavaScript (Comeet, Greenhouse, Lever…). → text or ''.
export function jobPostingFromLd(html, max = 20_000) {
  const blocks = String(html || '').matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, raw] of blocks) {
    let data;
    try { data = JSON.parse(raw.trim()); } catch { continue; }
    const items = [].concat(data, data?.['@graph'] || []).flat();
    const job = items.find(x => x && [].concat(x['@type']).includes('JobPosting'));
    if (!job) continue;
    const place = [].concat(job.jobLocation || []).map(l => [l?.address?.addressLocality, l?.address?.addressCountry?.name || l?.address?.addressCountry].filter(Boolean).join(', ')).filter(Boolean).join('; ');
    const lines = [
      job.title && `Title: ${job.title}`,
      job.hiringOrganization?.name && `Company: ${job.hiringOrganization.name}`,
      place && `Location: ${place}`,
      job.jobLocationType && `Location type: ${job.jobLocationType}`,
      job.employmentType && `Employment: ${[].concat(job.employmentType).join(', ')}`,
      '',
      htmlToText(decodeEntities(job.description || ''), max),
    ].filter(x => x !== undefined && x !== false && x !== null);
    const text = lines.join('\n').trim();
    if (text.length > 80) return text.slice(0, max);
  }
  return '';
}

// Untrusted text goes into the prompt between <page> tags: make sure it can't close them (or open new ones).
export const fence = s => String(s).replace(/<\/?\s*(page|job|profile|instructions)\b[^>]*>/gi, m => m.replace(/</g, '‹').replace(/>/g, '›'));
