import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progress } from '../../public/js/model/progress.js';

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
