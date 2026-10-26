// Sorting the sheet by a column. Empty values always go last, whichever direction.
// Ties are broken by a fixed chain (owner's rule), whatever the sorted column and direction:
// next meeting (soonest first) → last interaction (most recent first) → status (Interested, Approached me,
// In process…) → company name (A–Z).
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

const TIEBREAK = [['meeting', 1], ['last', -1], ['status', 1], ['name', 1]];

// Compare two companies on one key; empty values go last regardless of direction.
function compareBy(key, dir, a, b, ctx) {
  const f = SORTERS[key];
  const x = f(a, ctx), y = f(b, ctx);
  const blank = v => v === null || v === '';
  if (x === y || (blank(x) && blank(y))) return 0;
  if (blank(x)) return 1;
  if (blank(y)) return -1;
  return (x < y ? -1 : 1) * dir;
}

export function sortCompanies(list, sort, ctx = {}) {
  if (!SORTERS[sort?.key]) return list;
  const chain = [[sort.key, sort.dir], ...TIEBREAK.filter(([k]) => k !== sort.key)];
  return [...list].sort((a, b) => {
    for (const [key, dir] of chain) {
      const r = compareBy(key, dir, a, b, ctx);
      if (r) return r;
    }
    return 0;
  });
}
