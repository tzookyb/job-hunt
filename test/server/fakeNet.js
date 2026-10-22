// A fake network for lookup tests: the first route whose pattern matches the URL answers it.
export function fakeGet(routes) {
  const calls = [];
  const get = async url => {
    calls.push(url);
    for (const [pattern, answer] of routes) {
      if (typeof pattern === 'string' ? url.startsWith(pattern) : pattern.test(url)) {
        const r = typeof answer === 'function' ? answer(url) : answer;
        return r && { status: 200, url, type: 'text/html', ...r };
      }
    }
    return null;
  };
  get.calls = calls;
  return get;
}

export const json = value => ({ type: 'application/json', body: JSON.stringify(value) });
export const html = body => ({ type: 'text/html', body });
export const image = { type: 'image/png', body: 'png' };
