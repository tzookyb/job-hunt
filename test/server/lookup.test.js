import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plausible, norm } from '../../server/lookup/names.js';
import { iconCandidates } from '../../server/lookup/logo.js';
import { unwrapLinks } from '../../server/lookup/search.js';
import { createLookup } from '../../server/lookup/index.js';
import { startApp } from '../helpers.js';
import { fakeGet, json, html, image } from './fakeNet.js';

test('a plausible company domain looks like the name, and is not a directory site', () => {
  assert.ok(plausible('https://www.acme.io', 'acme'));
  assert.ok(plausible('https://wix.com', 'wix'));             // "x.com" must not match inside "wix.com"
  assert.ok(!plausible('https://x.com/acme', 'acme'));
  assert.ok(!plausible('https://en.wikipedia.org/wiki/Acme', 'acme'));
  assert.ok(!plausible('https://other.com', 'acme'));
  assert.equal(norm('Monday.com Ltd'), 'mondaycomltd');
});

test('icon candidates: SVG first, then the biggest', () => {
  const page = `<link rel="icon" href="/fav-16.png" sizes="16x16"><link rel="apple-touch-icon" href="/touch.png">
    <link rel="mask-icon" href="/mask.svg"><link rel="icon" type="image/svg+xml" href="/logo.svg">`;
  assert.deepEqual(iconCandidates(page, 'https://acme.io'), ['https://acme.io/logo.svg', 'https://acme.io/touch.png', 'https://acme.io/fav-16.png']);
});

test('search result links are unwrapped', () => {
  const ddg = '<a href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.glassdoor.com%2FOverview%2FWorking-at-Acme-EI_IE1.htm&amp;rut=x">';
  assert.match(unwrapLinks(ddg), / https:\/\/www\.glassdoor\.com\/Overview\/Working-at-Acme-EI_IE1\.htm /);
  const bing = '<a href="https://www.bing.com/ck/a?!&&p=1&u=a1' + Buffer.from('https://acme.io/jobs').toString('base64url') + '&ntb=1">';
  assert.match(unwrapLinks(bing), / https:\/\/acme\.io\/jobs /);
});

test('lookup finds the website, logo and Glassdoor', async () => {
  const get = fakeGet([
    ['https://api.duckduckgo.com/', json({ Infobox: { content: [{ data_type: 'official_website', label: 'Website', value: 'https://www.acme.io/' }] } })],
    ['https://www.wikidata.org/', json({ search: [] })],
    ['https://www.bing.com/search', html('<a href="https://www.glassdoor.com/Reviews/Acme-Reviews-E123.htm">')],
    ['https://www.acme.io/icon.svg', image],
    ['https://www.acme.io', html('<title>Acme</title><link rel="icon" href="/icon.svg">')],
  ]);
  const lookup = createLookup({ get, log: () => {} });
  const r = await lookup('Acme');
  assert.equal(r.website, 'https://www.acme.io');
  assert.equal(r.logo, 'https://www.acme.io/icon.svg');
  assert.equal(r.glassdoorUrl, 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE123.11,15.htm');
  assert.equal(r.source, 'duckduckgo');
});

test('lookup falls back to guessing domains and skips parked pages', async () => {
  const get = fakeGet([
    ['https://globex.com', html('<title>This domain is for sale</title>')],
    ['https://globex.io', html('<title>Globex — the future</title>')],
  ]);
  const r = await createLookup({ get, log: () => {} })('Globex');
  assert.equal(r.website, 'https://globex.io');
  assert.equal(r.source, 'guess');
  assert.match(r.logo, /google\.com\/s2\/favicons\?domain=globex\.io/);
});

test('GET /api/lookup', async () => {
  const app = await startApp({}, { lookup: async name => ({ website: 'https://' + name + '.io' }) });
  try {
    assert.equal((await fetch(app.base + '/api/lookup')).status, 400);
    assert.deepEqual(await (await fetch(app.base + '/api/lookup?name=acme')).json(), { website: 'https://acme.io' });
  } finally { await app.close(); }
});
