// Automatic status changes (owner's rules). Pure: no DOM, no I/O.
// - Any progress (a stage ticked done, a meeting scheduled) on an Interested / Approached me / Gone cold company
//   moves it to In process.
// - An In process company with no upcoming meeting and nothing new for more than 7 full days goes cold
//   (last move on day 0 → Gone cold on day 8).
import { daysBetween, today as localDay } from '../util.js';
import { nextMeeting } from './meetings.js';

export const COLD_AFTER_DAYS = 7;
const TO_ACTIVE = ['interested', 'approached', 'cold'];

// Changing the status, by hand or automatically, restarts the cold clock.
export function setStatus(c, status, day) {
  c.status = status;
  c.statusSince = day;
}

// Something moved forward. Returns true when that changed the status.
export function noteProgress(c, day) {
  if (!TO_ACTIVE.includes(c.status)) return false;
  setStatus(c, 'active', day);
  return true;
}

// The last day anything happened: last interaction, a status change, a meeting that has taken place, or the day
// the company was added. '' when there's nothing to go by.
export function lastMove(c, day) {
  const dates = [c.lastInteraction, c.statusSince, c.createdAt ? localDay(new Date(c.createdAt)) : ''];
  for (const id of c.order || []) {
    const m = c.stages[id]?.meeting;
    if (m && m.slice(0, 10) <= day) dates.push(m.slice(0, 10));
  }
  return dates.filter(Boolean).sort().pop() || '';
}

export function isGoingCold(c, day) {
  if (c.status !== 'active' || nextMeeting(c, day)) return false;
  const last = lastMove(c, day);
  return !!last && daysBetween(last, day) > COLD_AFTER_DAYS;
}

// Moves every company that went cold. Returns the companies it changed.
export function applyCold(state, day) {
  const moved = state.companies.filter(c => isGoingCold(c, day));
  for (const c of moved) setStatus(c, 'cold', day);
  return moved;
}
