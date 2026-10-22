import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';

test('empty data gets the default stages and no companies', () => {
  const { data } = normalize(null);
  assert.ok(data.stages.length >= 5);
  assert.deepEqual(data.companies, []);
});

test('partial companies are filled with defaults for every stage', () => {
  const { data } = normalize({ stages: [{ id: 'a', name: 'Applied' }], companies: [{ id: 'c1', name: 'Acme' }] });
  const c = data.companies[0];
  assert.deepEqual(c.stages.a, { enabled: true, done: false, comment: '' });
  assert.equal(c.status, 'active');
  assert.deepEqual(c.notes, []);
});

test('normalize does not mutate its input', () => {
  const raw = { stages: [{ id: 'a', name: 'Applied' }], companies: [{ id: 'c1' }] };
  normalize(raw);
  assert.equal(raw.companies[0].stages, undefined);
});
