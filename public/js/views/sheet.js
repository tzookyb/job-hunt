// The main screen: active companies, and a collapsible "Rejected & closed" table below them.
// Logo + Company are frozen on the left and open the company page; the other columns sort on click and can be
// dragged into another order.
import { esc, today } from '../util.js';
import { mainEl, delegate, $, $$ } from '../dom.js';
import { isClosed } from '../config.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { matches } from '../model/search.js';
import { sortCompanies, nextSort } from '../model/sort.js';
import { moveTo } from '../model/stages.js';
import { removeCompany } from '../model/company.js';
import { companyOf, agoHtml, meetingHtml, logoHtml } from './common.js';
import { COLS, loadColumnOrder, saveColumnOrder } from './columns.js';
import { reopen } from './popover.js';
import { actionBadgeHtml } from './action.js';

const SORT_KEY = 'jobTrackerSort';
const query = () => $('#q').value;
let closedOpen = true;
let colOrder = loadColumnOrder();
let sort = { key: null, dir: 1 };
try { sort = JSON.parse(localStorage.getItem(SORT_KEY)) || sort; } catch { /* keep default */ }

const sortClass = key => sort.key === key ? (sort.dir > 0 ? 'sorted-asc' : 'sorted-desc') : '';
const th = (key, label, cls = '') => `<th data-sort="${key}" class="${cls} ${sortClass(key)}">${label}</th>`;
const movableTh = (col, closed) => {
  const [key, label] = COLS[col].sort(closed);
  return `<th data-sort="${key}" data-col="${col}" draggable="true" title="Click to sort · drag to move" class="${sortClass(key)}">${label}</th>`;
};

function rowHtml(c, closed = isClosed(c)) {
  const open = `title="Open ${esc(c.name || 'company')}"`;
  return `<tr class="row st-${c.status}" data-id="${c.id}">
    <td class="stk stk1 goto" ${open}>${logoHtml(c)}</td>
    <td class="stk stk2 goto" ${open}><div class="cocell"><span class="coname ${c.name ? '' : 'untitled'}">${esc(c.name || 'Untitled')}</span>${actionBadgeHtml(c)}</div></td>
    ${colOrder.map(k => COLS[k].td(c, closed)).join('')}
    <td><button class="icon del" title="Delete">✕</button></td>
  </tr>`;
}

function tableHtml(list, closed, emptyText = '') {
  return `<div class="sheet-wrap"><table class="sheet ${closed ? 'closedtbl' : ''}">
    <colgroup><col class="col-logo"><col class="col-name">${colOrder.map(k => `<col class="${COLS[k].col(closed)}">`).join('')}<col class="col-del"></colgroup>
    <thead><tr><th class="stk stk1"></th>${th('name', 'Company', 'stk stk2')}${colOrder.map(k => movableTh(k, closed)).join('')}<th></th></tr></thead>
    <tbody>${sortCompanies(list, sort, { today: today() }).map(c => rowHtml(c, closed)).join('')}</tbody>
  </table>${emptyText ? `<div class="empty">${emptyText}</div>` : ''}</div>`;
}

export function renderSheet() {
  const { companies } = getState();
  const list = companies.filter(c => matches(c, query()));
  const active = list.filter(c => !isClosed(c)), closed = list.filter(isClosed);
  $('#count').textContent = query().trim() ? `${list.length} of ${companies.length}` : `${active.length} active · ${closed.length} closed`;
  const empty = active.length ? '' : !companies.length ? 'No companies yet — click “+ Add Company”.' : query().trim() ? 'No matches.' : 'No active processes.';
  mainEl().innerHTML = `${tableHtml(active, false, empty)}
    ${closed.length ? `<details id="closedSec" ${closedOpen ? 'open' : ''}>
      <summary class="section-title">Rejected &amp; closed (${closed.length})</summary>
      ${tableHtml(closed, true)}
    </details>` : ''}`;
  $('#closedSec')?.addEventListener('toggle', e => { closedOpen = e.target.open; });
}

const rowOf = c => $(`tr.row[data-id="${c.id}"]`, mainEl());
const redrawRow = c => { const tr = rowOf(c); if (tr) tr.outerHTML = rowHtml(c); };

// Drag a header onto another to move its column there.
function initColumnDrag(main) {
  let dragging = null;
  const clear = () => $$('.col-drop-l,.col-drop-r', main).forEach(x => x.classList.remove('col-drop-l', 'col-drop-r'));
  delegate(main, 'dragstart', 'th[data-col]', (e, h) => {
    dragging = h.dataset.col;
    h.classList.add('col-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragging);
  });
  delegate(main, 'dragover', 'th[data-col]', (e, h) => {
    if (!dragging) return;
    e.preventDefault();
    clear();
    const r = h.getBoundingClientRect();
    h.classList.add(e.clientX > r.left + r.width / 2 ? 'col-drop-r' : 'col-drop-l');
  });
  delegate(main, 'drop', 'th[data-col]', (e, h) => {
    if (!dragging) return;
    e.preventDefault();
    colOrder = moveTo(colOrder, dragging, h.dataset.col, h.classList.contains('col-drop-r'));
    saveColumnOrder(colOrder);
    dragging = null;
    emit('render');
  });
  main.addEventListener('dragend', () => { if (dragging) { dragging = null; emit('render'); } });
}

export function init() {
  const main = mainEl();
  delegate(main, 'click', 'th[data-sort]', (e, el) => {
    sort = nextSort(sort, el.dataset.sort);
    try { localStorage.setItem(SORT_KEY, JSON.stringify(sort)); } catch { /* not remembered */ }
    emit('render');
  });
  initColumnDrag(main);
  delegate(main, 'click', 'tr.row td.goto', (e, el) => { if (e.target.closest('.act-btn')) return; location.hash = '#/c/' + companyOf(el).id; });
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
  on('meeting:changed', c => { const cell = rowOf(c)?.querySelector('.meet'); if (cell) cell.outerHTML = meetingHtml(c); });
  // a new stage reaches every company: redraw all rows, then bring the popover back
  on('stages:changed', ({ c }) => {
    if (location.hash) return;
    getState().companies.forEach(redrawRow);
    reopen(c);
  });
}
