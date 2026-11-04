import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progress, closedText } from '../../public/js/model/progress.js';

const company = stages => ({ stages });

test('counts only relevant stages and finds the next one', () => {
  const c = company({
    a: { enabled: true, done: true }, b: { enabled: false, done: false },
    c: { enabled: true, done: false }, d: { enabled: true, done: false },
  });
  assert.deepEqual(progress({ ...c, order: ['a', 'b', 'c', 'd'] }), { done: 1, total: 3, pct: 33, next: 'c', last: 'a' });
});

test('no relevant stages means 0%', () => {
  assert.deepEqual(progress({ ...company({ a: { enabled: false } }), order: ['a'] }), { done: 0, total: 0, pct: 0, next: null, last: null });
});

test('a closed company names the last stage it completed', () => {
  assert.equal(closedText('Rejected', 'Phone interview'), 'Rejected after Phone interview');
  assert.equal(closedText('Withdrew', 'HR'), 'Withdrew after HR');
  assert.equal(closedText('Gone cold', 'Application'), 'Gone cold after Application');
  assert.equal(closedText('Rejected', null), 'Rejected');
});
