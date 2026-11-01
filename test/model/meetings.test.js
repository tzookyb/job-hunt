import { test } from 'node:test';
import assert from 'node:assert/strict';
import { meetingPassed } from '../../public/js/model/meetings.js';

test('meetingPassed: timed meetings are over after their start time', () => {
  assert.equal(meetingPassed('2026-10-26T10:00', '2026-10-26T13:52'), true);
  assert.equal(meetingPassed('2026-10-26T15:00', '2026-10-26T13:52'), false);
  assert.equal(meetingPassed('2026-10-27T09:00', '2026-10-26T13:52'), false);
});

test('meetingPassed: a date-only meeting lasts the whole day', () => {
  assert.equal(meetingPassed('2026-10-26', '2026-10-26T23:59'), false);
  assert.equal(meetingPassed('2026-10-25', '2026-10-26T00:00'), true);
});
