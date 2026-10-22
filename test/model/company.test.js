import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';
import { newCompany, setStageDone } from '../../public/js/model/company.js';

const state = () => normalize({ stages: [{ id: 'a', name: 'Applied' }] }).data;

test('adding a company is not an interaction', () => {
  assert.equal(newCompany(state()).lastInteraction, '');
});

test('ticking a stage sets last interaction; unticking leaves it', () => {
  const c = newCompany(state());
  setStageDone(c, 'a', true, '2026-10-22');
  assert.equal(c.lastInteraction, '2026-10-22');
  setStageDone(c, 'a', false, '2026-10-23');
  assert.equal(c.lastInteraction, '2026-10-22');
  assert.equal(c.stages.a.done, false);
});
