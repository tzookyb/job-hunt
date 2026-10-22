import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toOverview } from '../../server/lookup/glassdoor.js';

test('any Glassdoor company page becomes its Overview tab', () => {
  const overview = 'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE380463.11,15.htm';
  for (const url of [
    'https://www.glassdoor.com/Reviews/Acme-Reviews-E380463.htm',
    'https://www.glassdoor.co.uk/Reviews/Acme-Reviews-E380463.htm',
    'https://www.glassdoor.com/Salary/Acme-Salaries-E380463.htm',
    'https://www.glassdoor.com/Interview/Acme-Interview-Questions-E380463.htm',
    'https://www.glassdoor.com/Benefits/Acme-Benefits-E380463.htm',
    'https://www.glassdoor.com/Overview/Working-at-Acme-EI_IE380463.11,15.htm',
  ]) assert.equal(toOverview(url), overview, url);
});

test('non-company pages are rejected', () => {
  assert.equal(toOverview('https://www.glassdoor.com/index.htm'), null);
  assert.equal(toOverview('not a url'), null);
});
