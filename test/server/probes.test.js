import { test } from 'node:test';
import assert from 'node:assert/strict';
import { slugs, looksLikeCompanyPage } from '../../server/lookup/probes.js';

test('slug spellings', () => {
  assert.deepEqual(slugs('Monday.com Ltd'), ['monday-com-ltd', 'mondaycomltd', 'monday']);
  assert.deepEqual(slugs('Acme'), ['acme']);
});

test('a page counts only if its title names the company', () => {
  const page = title => ({ status: 200, type: 'text/html', body: `<title>${title}</title>` });
  assert.ok(looksLikeCompanyPage(page('Acme Labs Salaries | Levels.fyi'), 'acmelabs'));
  assert.ok(!looksLikeCompanyPage(page('Page not found — Acme Labs'), 'acmelabs'));
  assert.ok(!looksLikeCompanyPage(page('Levels.fyi'), 'acmelabs'));
  assert.ok(!looksLikeCompanyPage({ status: 404, type: 'text/html', body: '<title>Acme Labs</title>' }, 'acmelabs'));
});
