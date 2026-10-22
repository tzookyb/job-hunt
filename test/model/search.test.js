import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches } from '../../public/js/model/search.js';

const c = {
  name: 'Acme', position: 'Frontend Engineer', website: '', careersUrl: '', comments: 'remote friendly',
  stages: { a: { comment: 'ask about the team' } }, notes: [{ title: 'Tech phone', body: 'React hooks' }],
};

test('every word must match somewhere, case-insensitive', () => {
  assert.ok(matches(c, 'acme frontend'));
  assert.ok(matches(c, 'HOOKS team'));
  assert.ok(!matches(c, 'acme backend'));
});

test('an empty query matches everything', () => assert.ok(matches(c, '  ')));
