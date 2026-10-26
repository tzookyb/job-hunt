import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blankAction, hasAction, setAction, completeAction, removeLogEntry } from '../../public/js/model/action.js';
import { normalize } from '../../public/js/model/normalize.js';
import { matches } from '../../public/js/model/search.js';

const co = () => ({ action: blankAction(), actionLog: [] });

test('writing an action stamps the day it was set, clearing it resets that', () => {
  const c = co();
  setAction(c, 'text', 'Book tech interview', '2026-10-26');
  setAction(c, 'url', 'calendly.com/x', '2026-10-27');
  assert.equal(c.action.since, '2026-10-26');
  assert.ok(hasAction(c));
  setAction(c, 'text', '', '2026-10-27'); setAction(c, 'url', '', '2026-10-27');
  assert.equal(c.action.since, '');
  assert.ok(!hasAction(c));
});

test('done logs the action, newest first, and clears it', () => {
  const c = co();
  setAction(c, 'text', 'First', '2026-10-20');
  completeAction(c, '2026-10-21');
  setAction(c, 'text', ' Second ', '2026-10-22');
  setAction(c, 'url', 'https://cal.com/a', '2026-10-22');
  const e = completeAction(c, '2026-10-26');
  assert.deepEqual({ ...e, id: 'x' }, { id: 'x', text: 'Second', url: 'https://cal.com/a', since: '2026-10-22', done: '2026-10-26' });
  assert.deepEqual(c.actionLog.map(x => x.text), ['Second', 'First']);
  assert.deepEqual(c.action, blankAction());
  assert.equal(completeAction(c, '2026-10-26'), null);   // nothing pending
  removeLogEntry(c, e.id);
  assert.deepEqual(c.actionLog.map(x => x.text), ['First']);
});

test('old data loads with an empty action and log; actions are searchable', () => {
  const { data } = normalize({ companies: [{ name: 'Old' }] });
  assert.deepEqual(data.companies[0].action, blankAction());
  assert.deepEqual(data.companies[0].actionLog, []);
  const c = data.companies[0];
  setAction(c, 'text', 'Send portfolio', '2026-10-26');
  assert.ok(matches(c, 'portfolio'));
});
