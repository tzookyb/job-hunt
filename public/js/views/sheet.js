// The main sheet: one row per company.
import { esc } from '../util.js';
import { mainEl, delegate, $ } from '../dom.js';
import { isClosed } from '../config.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { matches } from '../model/search.js';
import { removeCompany } from '../model/company.js';
import { companyOf, statusOptions, progressInner } from './common.js';
import { reopen, popoverCompanyId } from './popover.js';

const query = () => $('#q').value;

function rowHtml(c) {
  return `<tr class="row st-${c.status} ${isClosed(c) ? 'closed' : ''}" data-id="${c.id}">
    <td><input data-f="name" value="${esc(c.name)}" placeholder="Company"></td>
    <td><input data-f="position" value="${esc(c.position)}" placeholder="Role"></td>
    <td><button class="prog ${popoverCompanyId() === c.id ? 'open' : ''}">${progressInner(c)}</button></td>
    <td><select data-f="status">${statusOptions(c.status)}</select></td>
    <td><button class="icon open" title="Open company page">⤢</button></td>
    <td><button class="icon del" title="Delete">✕</button></td>
  </tr>`;
}

export function renderSheet() {
  const { companies } = getState();
  const list = companies.filter(c => matches(c, query()));
  const open = list.filter(c => !isClosed(c)).length;
  $('#count').textContent = query().trim() ? `${list.length} of ${companies.length}` : `${open} active · ${list.length - open} closed`;
  const empty = companies.length ? (list.length ? '' : 'No matches.') : 'No companies yet — click “+ Company”.';
  mainEl().innerHTML = `<div class="sheet-wrap"><table class="sheet">
    <colgroup><col><col><col class="col-prog"><col class="col-status"><col class="col-open"><col class="col-del"></colgroup>
    <thead><tr><th>Company</th><th>Position</th><th>Progress</th><th>Status</th><th></th><th></th></tr></thead>
    <tbody>${list.map(rowHtml).join('')}</tbody>
  </table>${empty ? `<div class="empty">${empty}</div>` : ''}</div>`;
}

const rowOf = c => $(`tr.row[data-id="${c.id}"]`, mainEl());

export function init() {
  const main = mainEl();
  delegate(main, 'click', 'tr.row .open', (e, el) => { location.hash = '#/c/' + companyOf(el).id; });
  delegate(main, 'click', 'tr.row .del', (e, el) => {
    const c = companyOf(el);
    if (!confirm(`Delete ${c.name || 'this company'}?`)) return;
    removeCompany(getState(), c.id); save(); emit('render');
  });
  on('field', ({ c, field }) => {
    const tr = rowOf(c);
    if (tr && field === 'status') tr.outerHTML = rowHtml(c);
  });
  on('company:changed', c => { const tr = rowOf(c); if (tr) tr.outerHTML = rowHtml(c); });
  // a new stage reaches every company: redraw all rows, then bring the popover back
  on('stages:changed', ({ c }) => {
    if (location.hash) return;
    getState().companies.forEach(x => { const tr = rowOf(x); if (tr) tr.outerHTML = rowHtml(x); });
    reopen(c);
  });
}
