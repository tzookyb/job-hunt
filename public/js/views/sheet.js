// The main screen: active companies, and a collapsible "Rejected & closed" table below them.
import { esc } from '../util.js';
import { mainEl, delegate, $ } from '../dom.js';
import { isClosed } from '../config.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { matches } from '../model/search.js';
import { removeCompany } from '../model/company.js';
import { companyOf, statusOptions, progressInner, agoHtml } from './common.js';
import { reopen, popoverCompanyId } from './popover.js';

const query = () => $('#q').value;
let closedOpen = true;

function rowHtml(c) {
  const closed = isClosed(c);
  return `<tr class="row st-${c.status}" data-id="${c.id}">
    <td><input data-f="name" value="${esc(c.name)}" placeholder="Company"></td>
    <td><button class="prog ${popoverCompanyId() === c.id ? 'open' : ''}">${progressInner(c)}</button></td>
    ${closed ? `<td><input data-f="closeReason" value="${esc(c.closeReason)}" placeholder="Why? e.g. no feedback, salary, ghosted…"></td>` : ''}
    <td><div class="datecell"><input type="date" data-f="lastInteraction" value="${esc(c.lastInteraction)}">${agoHtml(c.lastInteraction)}</div></td>
    <td><select data-f="status">${statusOptions(c.status)}</select></td>
    <td><button class="icon open" title="Open company page">⤢</button></td>
    <td><button class="icon del" title="Delete">✕</button></td>
  </tr>`;
}

function tableHtml(list, closed, emptyText = '') {
  return `<div class="sheet-wrap"><table class="sheet ${closed ? 'closedtbl' : ''}">
    <colgroup><col class="col-name"><col class="col-prog">${closed ? '<col class="col-reason">' : ''}<col class="col-date"><col class="col-status"><col class="col-open"><col class="col-del"></colgroup>
    <thead><tr><th>Company</th><th>Progress</th>${closed ? '<th>Reason</th>' : ''}<th>Last interaction</th><th>Status</th><th></th><th></th></tr></thead>
    <tbody>${list.map(rowHtml).join('')}</tbody>
  </table>${emptyText ? `<div class="empty">${emptyText}</div>` : ''}</div>`;
}

export function renderSheet() {
  const { companies } = getState();
  const list = companies.filter(c => matches(c, query()));
  const active = list.filter(c => !isClosed(c)), closed = list.filter(isClosed);
  $('#count').textContent = query().trim() ? `${list.length} of ${companies.length}` : `${active.length} active · ${closed.length} closed`;
  const empty = active.length ? '' : !companies.length ? 'No companies yet — click “+ Company”.' : query().trim() ? 'No matches.' : 'No active processes.';
  mainEl().innerHTML = `${tableHtml(active, false, empty)}
    ${closed.length ? `<details id="closedSec" ${closedOpen ? 'open' : ''}>
      <summary class="section-title">Rejected &amp; closed (${closed.length})</summary>
      ${tableHtml(closed, true)}
    </details>` : ''}`;
  $('#closedSec')?.addEventListener('toggle', e => { closedOpen = e.target.open; });
}

const rowOf = c => $(`tr.row[data-id="${c.id}"]`, mainEl());
const redrawRow = c => { const tr = rowOf(c); if (tr) tr.outerHTML = rowHtml(c); };

export function init() {
  const main = mainEl();
  delegate(main, 'click', 'tr.row .open', (e, el) => { location.hash = '#/c/' + companyOf(el).id; });
  delegate(main, 'click', 'tr.row .del', (e, el) => {
    const c = companyOf(el);
    if (!confirm(`Delete ${c.name || 'this company'}?`)) return;
    removeCompany(getState(), c.id); save(); emit('render');
  });
  on('field', ({ c, field, el }) => {
    if (!rowOf(c)) return;
    if (field === 'status') emit('render');   // may move between the two tables
    if (field === 'lastInteraction') el.nextElementSibling.outerHTML = agoHtml(c.lastInteraction);
  });
  on('company:changed', redrawRow);
  // a new stage reaches every company: redraw all rows, then bring the popover back
  on('stages:changed', ({ c }) => {
    if (location.hash) return;
    getState().companies.forEach(redrawRow);
    reopen(c);
  });
}
