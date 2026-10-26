// Building blocks shared by several views.
import { esc, today, daysBetween } from '../util.js';
import { STATUSES, statusLabel, isClosed } from '../config.js';
import { getState } from '../store.js';
import { progress } from '../model/progress.js';
import { nextMeeting, TIME_24 } from '../model/meetings.js';

// The company that a clicked/edited element belongs to (nearest [data-id]).
export function companyOf(el) {
  const host = el.closest('[data-id]');
  return host ? getState().companies.find(c => c.id === host.dataset.id) : null;
}

export const stageName = id => (getState().stages.find(s => s.id === id) || {}).name || '?';

export const statusOptions = value =>
  STATUSES.map(([k, label]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${label}</option>`).join('');

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

// Next meeting cell: "Tomorrow · 10:30" + stage name; highlighted for today and tomorrow.
export function meetingHtml(c) {
  const m = nextMeeting(c, today());
  if (!m) return '<div class="meet none">—</div>';
  const d = new Date(m.when);
  const days = daysBetween(today(), m.when.slice(0, 10));
  const day = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const time = m.when.length > 10 ? ' · ' + d.toLocaleTimeString(undefined, TIME_24) : '';
  return `<div class="meet ${days <= 1 ? 'soon' : ''}" title="${esc(stageName(m.stage))} — ${esc(d.toLocaleString(undefined, { dateStyle: 'medium', ...(m.when.length > 10 ? { timeStyle: 'short', hourCycle: 'h23' } : {}) }))}"><b>${day}${time}</b><small>${esc(stageName(m.stage))}</small></div>`;
}

// bar · percent · "x/y · <last done stage> - done. next: <stage>"
export function progressInner(c) {
  const p = progress(c);
  let text = `${p.done}/${p.total}`;
  if (isClosed(c)) text += ` · ${statusLabel(c.status)}${p.next ? ' at ' + stageName(p.next) : ''}`;
  else {
    const parts = [];
    if (p.last) parts.push(`${stageName(p.last)} - done`);
    if (p.next) parts.push(`next: ${stageName(p.next)}`);
    if (parts.length) text += ` · ${parts.join('. ')}`;
  }
  return `<span class="bar"><span style="width:${p.pct}%"></span></span><span class="pct">${p.pct}%</span><span class="pn">${esc(text)}</span>`;
}
