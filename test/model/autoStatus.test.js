import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';
import { newCompany, setStageDone } from '../../public/js/model/company.js';
import { noteProgress, setStatus, lastMove, isGoingCold, applyCold } from '../../public/js/model/autoStatus.js';

const state = () => normalize({ stages: [{ id: 'a', name: 'Applied' }, { id: 'b', name: 'HR phone' }] }).data;
const company = (fields = {}) => newCompany(state(), { createdAt: undefined, ...fields });

test('ticking a stage moves Interested, Approached me and Gone cold to In process', () => {
  for (const status of ['interested', 'approached', 'cold']) {
    const c = company({ status });
    assert.equal(setStageDone(c, 'a', true, '2026-11-01'), true);
    assert.equal(c.status, 'active');
    assert.equal(c.statusSince, '2026-11-01');
  }
});

test('progress never reopens a rejected or withdrawn process, and unticking changes nothing', () => {
  for (const status of ['rejected', 'withdrawn', 'active']) {
    const c = company({ status });
    assert.equal(noteProgress(c, '2026-11-01'), false);
    assert.equal(c.status, status);
  }
  const c = company({ status: 'interested' });
  assert.equal(setStageDone(c, 'a', false, '2026-11-01'), false);
  assert.equal(c.status, 'interested');
});

test('goes cold only after 7 full days: day 7 stays, day 8 moves', () => {
  const c = company({ status: 'active', lastInteraction: '2026-10-01' });
  assert.equal(isGoingCold(c, '2026-10-08'), false);
  assert.equal(isGoingCold(c, '2026-10-09'), true);
});

test('an upcoming meeting keeps a process warm; a past one counts as the last move', () => {
  const c = company({ status: 'active', lastInteraction: '2026-10-01' });
  c.stages.b.meeting = '2026-10-20T10:00';
  assert.equal(isGoingCold(c, '2026-10-15'), false);   // meeting still ahead
  assert.equal(lastMove(c, '2026-10-25'), '2026-10-20');
  assert.equal(isGoingCold(c, '2026-10-27'), false);
  assert.equal(isGoingCold(c, '2026-10-28'), true);
});

test('a status set by hand restarts the clock; no dates at all never goes cold', () => {
  const c = company({ status: 'cold', lastInteraction: '2026-09-01' });
  setStatus(c, 'active', '2026-10-01');
  assert.equal(isGoingCold(c, '2026-10-08'), false);
  assert.equal(isGoingCold(company({ status: 'active' }), '2030-01-01'), false);
});

test('the day it was added counts when nothing else happened', () => {
  const c = company({ status: 'active', createdAt: new Date(2026, 9, 1, 12).getTime() });
  assert.equal(isGoingCold(c, '2026-10-08'), false);
  assert.equal(isGoingCold(c, '2026-10-09'), true);
});

test('applyCold moves only In process companies and returns them', () => {
  const s = state();
  s.companies = [
    company({ id: 'x', status: 'active', lastInteraction: '2026-10-01' }),
    company({ id: 'y', status: 'interested', lastInteraction: '2026-10-01' }),
    company({ id: 'z', status: 'active', lastInteraction: '2026-10-30' }),
  ];
  assert.deepEqual(applyCold(s, '2026-11-01').map(c => c.id), ['x']);
  assert.deepEqual(s.companies.map(c => c.status), ['cold', 'interested', 'active']);
  assert.equal(s.companies[0].statusSince, '2026-11-01');
});

test('normalize keeps the Gone cold status and fills statusSince', () => {
  const { data } = normalize({ stages: [{ id: 'a', name: 'Applied' }], companies: [{ id: 'c', status: 'cold' }] });
  assert.equal(data.companies[0].status, 'cold');
  assert.equal(data.companies[0].statusSince, '');
});
