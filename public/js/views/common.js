// Building blocks shared by several views.
import { esc } from '../util.js';
import { STATUSES, statusLabel, isClosed } from '../config.js';
import { getState } from '../store.js';
import { progress } from '../model/progress.js';

// The company that a clicked/edited element belongs to (nearest [data-id]).
export function companyOf(el) {
  const host = el.closest('[data-id]');
  return host ? getState().companies.find(c => c.id === host.dataset.id) : null;
}

export const stageName = id => (getState().stages.find(s => s.id === id) || {}).name || '?';
export const stageOrder = () => getState().stages.map(s => s.id);

export const statusOptions = value =>
  STATUSES.map(([k, label]) => `<option value="${k}" ${k === value ? 'selected' : ''}>${label}</option>`).join('');

// bar · percent · "x/y · next: <stage>"
export function progressInner(c) {
  const p = progress(c, stageOrder());
  let text = `${p.done}/${p.total}`;
  if (isClosed(c)) text += ` · ${statusLabel(c.status)}${p.next ? ' at ' + stageName(p.next) : ''}`;
  else if (p.next) text += ` · next: ${stageName(p.next)}`;
  return `<span class="bar"><span style="width:${p.pct}%"></span></span><span class="pct">${p.pct}%</span><span class="pn">${esc(text)}</span>`;
}
