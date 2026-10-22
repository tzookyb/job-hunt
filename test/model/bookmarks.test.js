import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addBookmark, removeBookmark, moveBookmark, hostOf } from '../../public/js/model/bookmarks.js';

test('add (newest first), move and remove bookmarks', () => {
  const s = { bookmarks: [] };
  assert.equal(addBookmark(s, '  '), null);
  const a = addBookmark(s, 'example.com/jobs', ' Jobs ');
  const b = addBookmark(s, 'https://www.salary.dev');
  assert.deepEqual(s.bookmarks.map(x => x.id), [b.id, a.id]);
  assert.equal(a.title, 'Jobs');
  assert.ok(moveBookmark(s, b.id, a.id));
  assert.deepEqual(s.bookmarks.map(x => x.id), [a.id, b.id]);
  removeBookmark(s, a.id);
  assert.deepEqual(s.bookmarks, [b]);
});

test('host for display', () => {
  assert.equal(hostOf('https://www.salary.dev/x'), 'salary.dev');
  assert.equal(hostOf('example.com'), 'example.com');
});
