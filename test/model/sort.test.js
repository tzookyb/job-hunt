import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortCompanies, nextSort } from '../../public/js/model/sort.js';
import { nextMeeting } from '../../public/js/model/meetings.js';

const co = (name, extra = {}) => ({ name, order: [], stages: {}, status: 'active', lastInteraction: '', closeReason: '', ...extra });

test('sorts by a column; empty values go last in both directions', () => {
  const list = [co('b', { lastInteraction: '2026-10-01' }), co('a'), co('c', { lastInteraction: '2026-10-20' })];
  const names = s => sortCompanies(list, s).map(c => c.name).join('');
  assert.equal(names({ key: 'last', dir: 1 }), 'bca');
  assert.equal(names({ key: 'last', dir: -1 }), 'cba');
  assert.equal(names({ key: 'name', dir: 1 }), 'abc');
});

test('clicking a header: new column starts in its natural direction, same column flips', () => {
  assert.deepEqual(nextSort({ key: null, dir: 1 }, 'name'), { key: 'name', dir: 1 });
  assert.deepEqual(nextSort({ key: 'name', dir: 1 }, 'last'), { key: 'last', dir: -1 });
  assert.deepEqual(nextSort({ key: 'last', dir: -1 }, 'last'), { key: 'last', dir: 1 });
});

test('next meeting: earliest upcoming one on a relevant stage', () => {
  const c = co('x', {
    order: ['a', 'b', 'c', 'd'],
    stages: {
      a: { enabled: true, meeting: '2026-10-01T10:00' },   // past
      b: { enabled: true, meeting: '2026-10-25T09:00' },
      c: { enabled: false, meeting: '2026-10-23T09:00' },  // not relevant
      d: { enabled: true, meeting: '2026-10-24T15:30' },
    },
  });
  assert.deepEqual(nextMeeting(c, '2026-10-22'), { when: '2026-10-24T15:30', stage: 'd' });
  assert.equal(nextMeeting(c, '2026-11-01'), null);
});
