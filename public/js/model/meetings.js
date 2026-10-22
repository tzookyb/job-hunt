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

// Times are always shown and typed in 24-hour format (owner's preference), whatever the browser's locale.
export const TIME_24 = { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };

// What the user typed in a time box → "HH:MM", '' when empty, or null when it isn't a time.
// Accepts "9", "930", "0930", "9:30", "21.05".
export function parseTime(text) {
  const t = String(text || '').trim();
  if (!t) return '';
  const m = t.match(/^(\d{1,2})(?:[:.]?(\d{2}))?$/);
  if (!m) return null;
  const h = +m[1], min = +(m[2] || 0);
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

// date "YYYY-MM-DD" + time "HH:MM" → the stored meeting value ("YYYY-MM-DDTHH:mm", a bare date, or '').
export const combineMeeting = (date, time) => !date ? '' : time ? `${date}T${time}` : date;
