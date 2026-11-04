// Building blocks shared by several views.
import { esc, today, nowStamp, daysBetween } from '../util.js';
import { STATUSES, statusLabel, isClosed } from '../config.js';
import { getState } from '../store.js';
import { progress, closedText } from '../model/progress.js';
import { nextMeeting, meetingPassed, TIME_24 } from '../model/meetings.js';
import { lockedStageId } from '../model/stages.js';

// The company that a clicked/edited element belongs to (nearest [data-id]).
export function companyOf(el) {
  const host = el.closest('[data-id]');
  return host ? getState().companies.find(c => c.id === host.dataset.id) : null;
}

export const stageName = id => (getState().stages.find(s => s.id === id) || {}).name || '?';

export const statusOptions = value =>
  STATUSES.map(([k, label]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${label}</option>`).join('');

// Bin icon for delete buttons.
export const BIN = '<svg class="bin" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

// The company's logo, with its initial underneath as a fallback when there's no logo or it fails to load.
export function logoHtml(c, cls = '') {
  const initial = esc((c.name || '?').trim().charAt(0).toUpperCase() || '?');
  return `<span class="lg ${cls}"><span>${initial}</span>${c.logo ? `<img src="${esc(c.logo)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>`;
}

// "3 days ago" next to a date; amber once it's a week old.
export function agoHtml(date) {
  if (!date) return '<span class="ago"></span>';
  const days = daysBetween(date, today());
  const text = days === 0 ? 'today' : days === 1 ? 'yesterday' : days > 0 ? `${days} days ago` : `in ${-days} days`;
  return `<span class="ago ${days >= 7 ? 'stale' : ''}">${text}</span>`;
}

// Next up cell: "Tomorrow · 10:30" + stage name; highlighted for today and tomorrow, plain once it's over.
export function meetingHtml(c) {
  const m = nextMeeting(c, today(), lockedStageId(getState()));
  if (!m) return '<div class="meet none">—</div>';
  const d = new Date(m.when);
  const days = daysBetween(today(), m.when.slice(0, 10));
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = m.when.length > 10 ? ' · ' + d.toLocaleTimeString(undefined, TIME_24) : '';
  const cls = meetingPassed(m.when, nowStamp()) ? 'past' : days <= 1 ? 'soon' : '';
  return `<div class="meet ${cls}" title="${esc(stageName(m.stage))} — ${esc(d.toLocaleString(undefined, { dateStyle: 'medium', ...(m.when.length > 10 ? { timeStyle: 'short', hourCycle: 'h23' } : {}) }))}"><b>${day}${time}</b><small>${esc(stageName(m.stage))}</small></div>`;
}

// bar · percent · "x/y · <last done stage> - done. next: <stage>" (closed: "x/y · Rejected after <last done stage>")
export function progressInner(c) {
  const p = progress(c);
  let text = `${p.done}/${p.total}`;
  if (isClosed(c)) text += ` · ${closedText(statusLabel(c.status), p.last && stageName(p.last))}`;
  else {
    const parts = [];
    if (p.last) parts.push(`${stageName(p.last)} - done`);
    if (p.next) parts.push(`next: ${stageName(p.next)}`);
    if (parts.length) text += ` · ${parts.join('. ')}`;
  }
  return `<span class="bar"><span style="width:${p.pct}%"></span></span><span class="pct">${p.pct}%</span><span class="pn">${esc(text)}</span>`;
}
