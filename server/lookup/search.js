// Scraping a search engine's result page for links to one site.

// Result pages hide the real links (DuckDuckGo: uddg=…, Bing: u=a1<base64>) — unwrap them.
export function unwrapLinks(html) {
  return html.replace(/&amp;/g, '&')
    .replace(/uddg=([^&"']+)/g, (m, u) => { try { return ' ' + decodeURIComponent(u) + ' '; } catch { return m; } })
    .replace(/[?&]u=a1([A-Za-z0-9_-]+)/g, (m, b) => { try { return ' ' + Buffer.from(b, 'base64url').toString('utf8') + ' '; } catch { return m; } });
}

export function searchUrl(engine, query) {
  return engine === 'bing'
    ? 'https://www.bing.com/search?setlang=en&cc=us&q=' + encodeURIComponent(query)
    : 'https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query);
}

// A result page that is a bot check instead of results.
const BLOCKED = /(anomaly-modal|challenge-form|captcha|unusual traffic|are you a robot|verify you are human)/i;
const HAS_RESULTS = /class="[^"]*(b_algo|result__a|result__url)/;

export async function searchPage(get, engine, query) {
  // result pages are big: the results come after a lot of inline code
  const p = await get(searchUrl(engine, query), { timeout: 8000, max: 3_000_000 });
  if (!p) return { note: 'no response', text: '' };
  const hasResults = HAS_RESULTS.test(p.body);
  if (p.status !== 200 || (!hasResults && BLOCKED.test(p.body.slice(0, 50_000)))) return { note: `blocked (${p.status})`, text: '' };
  return { note: hasResults ? `${p.status}, ${Math.round(p.body.length / 1024)}KB` : `${p.status}, no results`, text: unwrapLinks(p.body) };
}

// Searches each engine in turn; returns { url, note } — the first URL `pick(text)` accepts, and what happened.
export async function searchFor(get, query, pick, engines = ['bing', 'duckduckgo']) {
  const notes = [];
  for (const engine of engines) {
    const r = await searchPage(get, engine, query);
    const url = r.text ? pick(r.text) : '';
    notes.push(`${engine}: ${r.note}${r.text ? (url ? ', found' : ', no match') : ''}`);
    if (url) return { url, note: notes.join(' · ') };
  }
  return { url: '', note: notes.join(' · ') };
}
