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

// Searches each engine in turn and returns the first URL that `pick(text)` accepts.
export async function searchFor(get, query, pick, engines = ['bing', 'duckduckgo']) {
  for (const engine of engines) {
    const page = await get(searchUrl(engine, query), { timeout: 8000, max: 400_000 });
    const url = page?.status === 200 ? pick(unwrapLinks(page.body)) : '';
    if (url) return url;
  }
  return '';
}
