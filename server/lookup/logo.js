// A company's logo: the best icon its homepage declares, else Google's favicon service.
import { hostOf, origin } from './names.js';

// <link rel="icon|apple-touch-icon"> tags, best first (SVG, then the biggest size).
export function iconCandidates(html, base) {
  const out = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const rel = (tag.match(/\brel\s*=\s*["']?([^"'>]+)/i) || [])[1] || '';
    const link = (tag.match(/\bhref\s*=\s*["']?([^"'\s>]+)/i) || [])[1];
    if (!link || !/icon/i.test(rel) || /mask-icon/i.test(rel)) continue;
    let score = +((tag.match(/\bsizes\s*=\s*["']?(\d+)/i) || [])[1] || 16);
    if (/apple-touch/i.test(rel)) score = Math.max(score, 180);
    if (/\.svg(\?|$)/i.test(link) || /image\/svg/i.test(tag)) score = 200;
    try { out.push({ url: new URL(link.replace(/&amp;/g, '&'), base).href, score }); } catch { /* bad href */ }
  }
  return out.sort((a, b) => b.score - a.score).map(x => x.url);
}

export async function findLogo(get, site, html = '') {
  if (!html) {
    const r = await get(site, { max: 400_000 });
    html = r?.status === 200 ? r.body : '';
    site = r?.url || site;
  }
  const isImage = async u => { const r = await get(u, { timeout: 4000, max: 600_000 }); return r?.status === 200 && /^image\//i.test(r.type); };
  for (const u of [...iconCandidates(html, site).slice(0, 3), origin(site) + '/apple-touch-icon.png']) {
    if (await isImage(u)) return u;
  }
  return `https://www.google.com/s2/favicons?domain=${hostOf(site)}&sz=128`;
}
