import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';
import { addStage, deleteStage, moveBy, moveTo, applyOrderToAll, stageUsage, lockedStageId } from '../../public/js/model/stages.js';

const state = () => normalize({
  stageDefaultsV2: true,
  stages: [{ id: 'a', name: 'Applied', defaultOn: true }, { id: 'b', name: 'HR phone', defaultOn: true }],
  companies: [{ id: 'open', status: 'active' }, { id: 'gone', status: 'rejected' }],
}).data;

test('a new stage reaches every company, switched on only where it was added', () => {
  const s = state();
  const [here, other] = s.companies;
  const st = addStage(s, '  CTO meeting ', here);
  assert.equal(st.name, 'CTO meeting');
  assert.equal(st.defaultOn, false);
  assert.equal(other.order.at(-1), st.id);
  assert.equal(here.stages[st.id].enabled, true);
  assert.equal(other.stages[st.id].enabled, false);
});

test('adding an existing name reuses it and switches it on for that company', () => {
  const s = state();
  s.companies[0].stages.b.enabled = false;
  assert.equal(addStage(s, 'hr PHONE', s.companies[0]).id, 'b');
  assert.equal(s.stages.length, 2);
  assert.equal(s.companies[0].stages.b.enabled, true);
});

test('deleting a stage removes it everywhere', () => {
  const s = state();
  assert.equal(deleteStage(s, 'b'), true);
  assert.deepEqual(s.stages.map(x => x.id), ['a']);
  assert.deepEqual(s.companies[0].order, ['a']);
  assert.equal(s.companies[0].stages.b, undefined);
});

test('the Application stage is locked: first, on everywhere, never deleted or moved', () => {
  const { data: s, migrated } = normalize({
    stageDefaultsV2: true,
    stages: [{ id: 'h', name: 'HR', defaultOn: true }, { id: 'a', name: 'Application', defaultOn: false }, { id: 't', name: 'Tech' }],
    companies: [{ id: 'x', order: ['t', 'a', 'h'], stages: { a: { enabled: false, done: true } } }],
  });
  assert.equal(migrated, true);
  assert.deepEqual(s.stages.map(x => [x.id, !!x.locked, x.defaultOn]), [['a', true, true], ['h', false, true], ['t', false, false]]);
  assert.equal(lockedStageId(s), 'a');
  const c = s.companies[0];
  assert.deepEqual(c.order, ['a', 't', 'h']);
  assert.equal(c.stages.a.enabled, true);
  assert.equal(c.stages.a.done, true);
  assert.equal(normalize(s).migrated, false);   // upgrade runs once
  assert.equal(deleteStage(s, 'a'), false);
  assert.equal(s.stages.length, 3);
  assert.equal(moveBy(c.order, 0, 1, 'a'), false);   // can't move it down
  assert.equal(moveBy(c.order, 1, -1, 'a'), false);  // nothing passes it
  assert.equal(moveBy(c.order, 1, 1, 'a'), true);
  assert.deepEqual(moveTo(['a', 'b', 'c'], 'a', 'c', true, 'a'), ['a', 'b', 'c']);
  assert.deepEqual(moveTo(['a', 'b', 'c'], 'c', 'a', false, 'a'), ['a', 'c', 'b']);   // dropped before it → after it
});

test('reordering helpers', () => {
  const list = ['a', 'b', 'c'];
  assert.equal(moveBy(list, 0, -1), false);
  assert.equal(moveBy(list, 0, 1), true);
  assert.deepEqual(list, ['b', 'a', 'c']);
  assert.deepEqual(moveTo(['a', 'b', 'c'], 'a', 'c', true), ['b', 'c', 'a']);
  assert.deepEqual(moveTo(['a', 'b', 'c'], 'c', 'a', false), ['c', 'a', 'b']);
});

test('apply the shared order to every company', () => {
  const s = state();
  s.companies[0].order = ['b', 'a'];
  applyOrderToAll(s);
  assert.deepEqual(s.companies[0].order, ['a', 'b']);
});

test('stage usage lists companies that would lose a ✓, meeting or comment — even where switched off', () => {
  const s = state();
  const [open, gone] = s.companies;
  open.stages.b = { enabled: false, done: false, comment: 'prep notes', meeting: '' };
  gone.stages.b = { enabled: true, done: true, comment: '', meeting: '2026-10-24T10:30' };
  const usage = stageUsage(s, 'b');
  assert.deepEqual(usage.map(u => [u.company.id, u.done, u.meeting, u.comment]), [
    ['open', false, '', 'prep notes'],
    ['gone', true, '2026-10-24T10:30', ''],
  ]);
  assert.deepEqual(stageUsage(s, 'a'), []);
});
