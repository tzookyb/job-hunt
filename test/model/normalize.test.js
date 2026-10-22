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
  assert.deepEqual(c.stages.a, { enabled: true, done: false, comment: '' });   // only stage → picked as default-on
  assert.equal(c.status, 'active');
  assert.deepEqual(c.notes, []);
});

test('normalize does not mutate its input', () => {
  const raw = { stages: [{ id: 'a', name: 'Applied' }], companies: [{ id: 'c1' }] };
  normalize(raw);
  assert.equal(raw.companies[0].stages, undefined);
});

test('removed statuses load as their replacements; unknown ones as "In process"', () => {
  const { data } = normalize({ companies: [{ status: 'offer' }, { status: 'closed' }, { status: 'weird' }, { status: 'approached' }] });
  assert.deepEqual(data.companies.map(c => c.status), ['active', 'withdrawn', 'active', 'approached']);
});

test('fresh data: only the first two default stages are on for new companies', () => {
  const { data, migrated } = normalize({});
  assert.deepEqual(data.stages.map(s => s.defaultOn), [true, true, false, false, false, false, false]);
  assert.equal(migrated, false);
});

test('stage-defaults upgrade runs once and keeps stages that hold data', () => {
  const raw = {
    stages: [{ id: 'a', name: 'Applied' }, { id: 'h', name: 'HR Initial' }, { id: 't', name: 'Tech phone' }, { id: 'o', name: 'Offer' }],
    companies: [
      { id: 'early', stages: { a: { enabled: true, done: true }, h: { enabled: true }, t: { enabled: true, comment: 'prep' }, o: { enabled: true } } },
      { id: 'past', stages: { a: { enabled: true, done: true }, h: { enabled: true, done: true }, t: { enabled: true }, o: { enabled: true } } },
    ],
  };
  const { data, migrated } = normalize(raw);
  assert.equal(migrated, true);
  assert.deepEqual(data.stages.map(s => s.defaultOn), [true, true, false, false]);
  const [early, past] = data.companies;
  assert.deepEqual(['a', 'h', 't', 'o'].map(id => early.stages[id].enabled), [true, true, true, false]);
  assert.deepEqual(['a', 'h', 't', 'o'].map(id => past.stages[id].enabled), [true, true, true, true]);
  assert.equal(normalize(data).migrated, false);   // never runs again
});
