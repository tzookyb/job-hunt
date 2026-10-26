// A company's pending action: one thing to do next (text + optional link). Finishing it moves it into the
// company's action log. Pure: no DOM, no I/O.
import { uid } from '../util.js';

export const blankAction = () => ({ text: '', url: '', since: '' });

export const hasAction = c => !!c.action?.text.trim();

// Editing the action. `since` is the day it was first written (kept while it's being edited, cleared with it).
export function setAction(c, field, value, day) {
  c.action[field] = value;
  if (!c.action.text.trim() && !c.action.url.trim()) c.action.since = '';
  else if (!c.action.since) c.action.since = day;
}

// Done: log it (newest first) and clear it. Returns the log entry, or null when there was nothing to finish.
export function completeAction(c, day) {
  if (!hasAction(c)) return null;
  const entry = { id: uid(), text: c.action.text.trim(), url: c.action.url.trim(), since: c.action.since || day, done: day };
  c.actionLog.unshift(entry);
  c.action = blankAction();
  return entry;
}

export function removeLogEntry(c, id) {
  c.actionLog = c.actionLog.filter(x => x.id !== id);
}
