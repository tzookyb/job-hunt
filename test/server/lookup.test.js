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

const wikidata = entities => [
  [/wbsearchentities/, json({ search: Object.entries(entities).map(([id, e]) => ({ id, label: e.label })) })],
  [/wbgetentities/, json({ entities: Object.fromEntries(Object.entries(entities).map(([id, e]) => [id, { claims: Object.fromEntries(Object.entries(e.claims).map(([p, v]) => [p, [{ mainsnak: { datavalue: { value: v } } }]])) }])) })],
];

test('lookup: website from DuckDuckGo, research links from Wikidata IDs, no searches needed', async () => {
  const get = fakeGet([
    ['https://api.duckduckgo.com/', json({ Infobox: { content: [{ data_type: 'official_website', label: 'Website', value: 'https://www.acme.io/' }] } })],
    ...wikidata({
      Q2: { label: 'Acme Tower', claims: { P856: 'https://skyline-towers.example' } },   // a building, not the company
      Q1: { label: 'Acme', claims: { P4264: 'acme-inc', P8060: '123', P2088: 'acme' } },
    }),
    ['https://www.acme.io/icon.svg', image],
    ['https://www.acme.io', html('<title>Acme</title><link rel="icon" href="/icon.svg">')],
  ]);
  const r = await createLookup({ get, log: () => {} })('Acme');
  assert.equal(r.website, 'https://www.acme.io');
  assert.equal(r.logo, 'https://www.acme.io/icon.svg');
  assert.deepEqual(r.links, {
    linkedinUrl: 'https://www.linkedin.com/company/acme-inc/',
    glassdoorUrl: 'https://www.glassdoor.com/Overview/-EI_IE123.htm',
    crunchbaseUrl: 'https://www.crunchbase.com/organization/acme',
    blindUrl: 'https://www.teamblind.com/company/Acme',   // naive fallback
  });
  assert.equal(r.log.linkedinUrl, 'wikidata');
  assert.ok(!get.calls.some(u => /bing\.com|html\.duckduckgo/.test(u)), 'no search-engine scraping');
});

test('lookup: one DuckDuckGo search for Glassdoor only when Wikidata has none', async () => {
  const get = fakeGet([
    [/html\.duckduckgo\.com.*glassdoor/, html('<a class="result__a" href="//duckduckgo.com/l/?uddg=' + encodeURIComponent('https://www.glassdoor.com/Reviews/Acme-Reviews-E123.htm') + '">')],
  ]);
  const r = await createLookup({ get, log: () => {} })('Acme');
  assert.equal(r.links.glassdoorUrl, 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE123.11,15.htm');
  assert.equal(get.calls.filter(u => /html\.duckduckgo|bing\.com/.test(u)).length, 1);
  assert.match(r.log.glassdoorUrl, /duckduckgo: 200, .*found/);
});

test('a bot-check page is reported as blocked', async () => {
  const get = fakeGet([[/html\.duckduckgo/, html('<form id="challenge-form">are you a robot?</form>')]]);
  const r = await createLookup({ get, log: () => {} })('Acme');
  assert.equal(r.links.glassdoorUrl, undefined);
  assert.match(r.log.glassdoorUrl, /blocked/);
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

test('lookup: links found on the company\'s own website, even with another slug', async () => {
  const get = fakeGet([
    ['https://api.duckduckgo.com/', json({ Results: [{ FirstURL: 'https://acme.io/' }] })],
    ['https://acme.io/careers', html('<a href="https://www.glassdoor.com/Overview/Working-at-Acme-Group-EI_IE77.11,21.htm">Reviews</a>')],
    ['https://acme.io/about', { status: 404, body: '' }],
    ['https://acme.io', html('<footer><a href="https:\\/\\/www.linkedin.com\\/company\\/acme-group-ltd">in</a> <a href="https://www.crunchbase.com/organization/acme-group">cb</a></footer>')],
  ]);
  const r = await createLookup({ get, log: () => {} })('Acme');
  assert.equal(r.links.linkedinUrl, 'https://www.linkedin.com/company/acme-group-ltd/');
  assert.equal(r.links.crunchbaseUrl, 'https://www.crunchbase.com/organization/acme-group');
  assert.equal(r.links.glassdoorUrl, 'https://www.glassdoor.com/Overview/Working-at-Acme-Group-EI_IE77.11,21.htm');
  assert.equal(r.log.linkedinUrl, 'company website');
  assert.ok(!get.calls.some(u => /html\.duckduckgo/.test(u)), 'no search needed when the website has Glassdoor');
});

test('lookup: guessed addresses are kept only when the page names the company', async () => {
  const get = fakeGet([
    ['https://www.levels.fyi/companies/acme-labs', html('<title>Acme Labs Salaries | Levels.fyi</title>')],
    ['https://www.comparably.com/companies/', html('<title>comparably-companies-ui</title>An unknown error occurred')],
  ]);
  const r = await createLookup({ get, log: () => {} })('Acme Labs');
  assert.equal(r.links.levelsUrl, 'https://www.levels.fyi/companies/acme-labs');
  assert.match(r.log.levelsUrl, /guessed address/);
  assert.equal(r.links.comparablyUrl, undefined);
});

test('guessing stops at the first block', async () => {
  const get = fakeGet([['https://www.levels.fyi/companies/', { status: 403, body: 'blocked' }]]);
  const r = await createLookup({ get, log: () => {} })('Acme Labs');
  assert.equal(r.links.levelsUrl, undefined);
  assert.equal(get.calls.filter(u => u.includes('levels.fyi')).length, 1);
});

test('Blind falls back to a naive address built from the name', async () => {
  const r = await createLookup({ get: fakeGet([]), log: () => {} })('Fiverr');
  assert.equal(r.links.blindUrl, 'https://www.teamblind.com/company/Fiverr');
  assert.match(r.log.blindUrl, /naive/);
  const r2 = await createLookup({ get: fakeGet([]), log: () => {} })(' Acme  Labs ');
  assert.equal(r2.links.blindUrl, 'https://www.teamblind.com/company/Acme-Labs');
});
