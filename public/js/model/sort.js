// Sorting the sheet by a column. Empty values always go last, whichever direction.
import { progress } from './progress.js';
import { nextMeeting } from './meetings.js';
import { STATUSES } from '../config.js';

export const SORTERS = {
  name: c => (c.name || '').toLowerCase(),
  progress: c => progress(c).pct,
  meeting: (c, ctx) => nextMeeting(c, ctx.today)?.when || null,
  reason: c => (c.closeReason || '').toLowerCase() || null,
  last: c => c.lastInteraction || null,
  status: c => STATUSES.findIndex(([k]) => k === c.status),
};

// Columns where "biggest first" is the useful first click.
const DESC_FIRST = ['last', 'progress'];

// Clicking a header: same column flips the direction, a new column starts in its natural direction.
export const nextSort = (sort, key) => sort.key === key ? { key, dir: -sort.dir } : { key, dir: DESC_FIRST.includes(key) ? -1 : 1 };

export function sortCompanies(list, sort, ctx = {}) {
  const f = SORTERS[sort?.key];
  if (!f) return list;
  const blank = v => v === null || v === '';
  return [...list].sort((a, b) => {
    const x = f(a, ctx), y = f(b, ctx);
    if (x === y) return 0;
    if (blank(x)) return 1;
    if (blank(y)) return -1;
    return (x < y ? -1 : 1) * sort.dir;
  });
}
