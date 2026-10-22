// The next scheduled meeting across a company's relevant stages.

// Earliest meeting on or after `fromDay` (YYYY-MM-DD), as { when, stage }, or null.
export function nextMeeting(c, fromDay) {
  let best = null;
  for (const id of c.order) {
    const x = c.stages[id];
    if (x.enabled && x.meeting && x.meeting.slice(0, 10) >= fromDay && (!best || x.meeting < best.when)) best = { when: x.meeting, stage: id };
  }
  return best;
}
