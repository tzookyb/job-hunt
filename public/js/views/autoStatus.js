// Automatic statuses (rules in model/autoStatus.js). A status picked by hand restarts the cold clock.
// Keeping an open tab current without a manual refresh: the cold check runs on load (store.js), then again when the
// tab comes back into view, just after local midnight, and hourly. The view is redrawn when a status moved or the
// date changed ("x days ago", "Tomorrow"), but never while something is being typed in or a dialog is open: then
// it waits until focus leaves the field.
import { today } from '../util.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { setStatus, applyCold } from '../model/autoStatus.js';

const HOURLY = 60 * 60 * 1000;
let shownDay = today();
let pending = false;

const busy = () => !!document.querySelector('dialog[open], .pop') ||
  !!document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]');

function refresh() {
  if (!getState() || document.hidden) return;
  if (applyCold(getState(), today()).length) { save(); pending = true; }
  if (today() !== shownDay) pending = true;
  if (!pending || busy()) return;
  pending = false;
  shownDay = today();
  emit('render');
}

function atMidnight() {
  const next = new Date();
  next.setHours(24, 0, 5, 0);   // 5s past local midnight
  setTimeout(() => { refresh(); atMidnight(); }, next - Date.now());
}

export function init() {
  on('field', ({ c, field }) => {
    if (field !== 'status') return;
    setStatus(c, c.status, today());
    save();
  });
  on('render', () => { shownDay = today(); });
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  document.addEventListener('focusout', () => { if (pending) setTimeout(refresh, 0); });
  on('popover:closed', () => { if (pending) setTimeout(refresh, 0); });
  document.addEventListener('close', () => { if (pending) setTimeout(refresh, 0); }, true);   // a dialog closed
  setInterval(refresh, HOURLY);
  atMidnight();
}
