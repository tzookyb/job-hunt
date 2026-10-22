// The sheet's movable columns. Logo + Company always come first; the rest can be dragged into any order, which is
// remembered per browser. Adding a column = adding an entry here.
import { esc } from '../util.js';
import { statusOptions, progressInner, agoHtml, meetingHtml } from './common.js';
import { popoverCompanyId } from './popover.js';

export const COLS = {
  progress: {
    col: () => 'col-prog', sort: () => ['progress', 'Progress'],
    td: c => `<td><button class="prog ${popoverCompanyId() === c.id ? 'open' : ''}">${progressInner(c)}</button></td>`,
  },
  meet: {   // Next meeting for active companies; Reason in the Rejected & closed table
    col: closed => closed ? 'col-reason' : 'col-meet',
    sort: closed => closed ? ['reason', 'Reason'] : ['meeting', 'Next meeting'],
    td: (c, closed) => `<td>${closed ? `<input data-f="closeReason" value="${esc(c.closeReason)}" placeholder="Why? e.g. no feedback, salary, ghosted…">` : meetingHtml(c)}</td>`,
  },
  last: {
    col: () => 'col-date', sort: () => ['last', 'Last interaction'],
    td: c => `<td><div class="datecell"><input type="date" data-f="lastInteraction" value="${esc(c.lastInteraction)}">${agoHtml(c.lastInteraction)}</div></td>`,
  },
  status: {
    col: () => 'col-status', sort: () => ['status', 'Status'],
    td: c => `<td><select data-f="status">${statusOptions(c.status)}</select></td>`,
  },
};

const KEY = 'jobHuntCols';
const DEFAULT = Object.keys(COLS);

export function loadColumnOrder() {
  try {
    const o = JSON.parse(localStorage.getItem(KEY));
    if (Array.isArray(o) && o.length === DEFAULT.length && DEFAULT.every(k => o.includes(k))) return o;
  } catch { /* use the default */ }
  return [...DEFAULT];
}

export function saveColumnOrder(order) {
  try { localStorage.setItem(KEY, JSON.stringify(order)); } catch { /* not remembered */ }
}
