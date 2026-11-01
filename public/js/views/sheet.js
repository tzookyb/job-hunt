// The main screen, three tables top to bottom: In process · Interested & approached me (collapsible) ·
// Rejected, withdrew & gone cold (collapsible). Statuses move between them on their own (model/autoStatus.js).
// Logo + Company are frozen on the left and open the company page; the other columns sort on click and can be
// dragged into another order.
import { esc, today } from '../util.js';
import { mainEl, delegate, $, $$ } from '../dom.js';
import { isClosed, isOpen } from '../config.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { matches } from '../model/search.js';
import { sortCompanies, nextSort } from '../model/sort.js';
import { moveTo, lockedStageId } from '../model/stages.js';
import { companyOf, agoHtml, meetingHtml, logoHtml, BIN } from './common.js';
import { askDelete } from './deleteDialog.js';
import { COLS, loadColumnOrder, saveColumnOrder } from './columns.js';
import { reopen, isPopoverOpen } from './popover.js';
import { actionBadgeHtml } from './action.js';

const SORT_KEY = 'jobTrackerSort';
const query = () => $('#q').value;
const sectionOpen = { openSec: true, closedSec: true };
let moveLater = false;   // a row changed table while its popover was open: redraw once the popover closes
let colOrder = loadColumnOrder();
// Each table has its own sort: { active, open, closed: { key, dir } }. An older single sort applies to all three.
const GROUPS = ['active', 'open', 'closed'];
const sorts = {};
try {
  const saved = JSON.parse(localStorage.getItem(SORT_KEY)) || {};
  for (const g of GROUPS) sorts[g] = (saved.key !== undefined ? saved : saved[g]) || { key: null, dir: 1 };
} catch { for (const g of GROUPS) sorts[g] = { key: null, dir: 1 }; }

const sortClass = (g, key) => sorts[g].key === key ? (sorts[g].dir > 0 ? 'sorted-asc' : 'sorted-desc') : '';
const th = (g, key, label, cls = '') => `<th data-sort="${key}" class="${cls} ${sortClass(g, key)}">${label}</th>`;
const movableTh = (g, col, closed) => {
  const [key, label] = COLS[col].sort(closed);
  return `<th data-sort="${key}" data-col="${col}" draggable="true" title="Click to sort · drag to move" class="${sortClass(g, key)}">${label}</th>`;
};

function rowHtml(c, closed = isClosed(c)) {
  const open = `title="Open ${esc(c.name || 'company')}"`;
  return `<tr class="row st-${c.status}" data-id="${c.id}">
    <td class="stk stk1 goto" ${open}>${logoHtml(c)}</td>
    <td class="stk stk2 goto" ${open}><div class="cocell"><span class="coname ${c.name ? '' : 'untitled'}">${esc(c.name || 'Untitled')}</span>${actionBadgeHtml(c)}</div></td>
    ${colOrder.map(k => COLS[k].td(c, closed)).join('')}
    <td><button class="icon del" title="Delete…">${BIN}</button></td>
  </tr>`;
}

function tableHtml(g, list, emptyText = '') {
  const closed = g === 'closed';
  return `<div class="sheet-wrap"><table class="sheet ${closed ? 'closedtbl' : ''}" data-group="${g}">
    <colgroup><col class="col-logo"><col class="col-name">${colOrder.map(k => `<col class="${COLS[k].col(closed)}">`).join('')}<col class="col-del"></colgroup>
    <thead><tr><th class="stk stk1"></th>${th(g, 'name', 'Company', 'stk stk2')}${colOrder.map(k => movableTh(g, k, closed)).join('')}<th></th></tr></thead>
    <tbody>${sortCompanies(list, sorts[g], { today: today(), skip: lockedStageId(getState()) }).map(c => rowHtml(c, closed)).join('')}</tbody>
  </table>${emptyText ? `<div class="empty">${emptyText}</div>` : ''}</div>`;
}

const section = (id, title, list, g) => list.length ? `<details id="${id}" ${sectionOpen[id] ? 'open' : ''}>
      <summary class="section-title">${title} (${list.length})</summary>
      ${tableHtml(g, list)}
    </details>` : '';

export function renderSheet() {
  moveLater = false;
  const { companies } = getState();
  const list = companies.filter(c => matches(c, query()));
  const active = list.filter(c => !isClosed(c) && !isOpen(c)), open = list.filter(isOpen), closed = list.filter(isClosed);
  $('#count').textContent = query().trim() ? `${list.length} of ${companies.length}` : `${active.length} in process · ${open.length} interested · ${closed.length} closed`;
  const empty = active.length ? '' : !companies.length ? 'No companies yet — click “+ Add Company”.' : query().trim() ? 'No matches.' : 'Nothing in process.';
  mainEl().innerHTML = `<div class="section-title static">In process (${active.length})</div>
    ${tableHtml('active', active, empty)}
    ${section('openSec', 'Interested &amp; approached me', open, 'open')}
    ${section('closedSec', 'Rejected, withdrew &amp; gone cold', closed, 'closed')}`;
  for (const id of Object.keys(sectionOpen)) $('#' + id)?.addEventListener('toggle', e => { sectionOpen[id] = e.target.open; });
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
    const g = el.closest('table').dataset.group;
    sorts[g] = nextSort(sorts[g], el.dataset.sort);
    try { localStorage.setItem(SORT_KEY, JSON.stringify(sorts)); } catch { /* not remembered */ }
    emit('render');
  });
  initColumnDrag(main);
  delegate(main, 'click', 'tr.row td.goto', (e, el) => { if (e.target.closest('.act-btn, .act-add')) return; location.hash = '#/c/' + companyOf(el).id; });
  delegate(main, 'click', 'tr.row .del', async (e, el) => {
    if (await askDelete(companyOf(el)) === 'deleted') emit('render');
  });
  on('field', ({ c, field, el }) => {
    if (!rowOf(c)) return;
    if (field === 'status') emit('render');   // may move to another table
    if (field === 'lastInteraction') el.nextElementSibling.outerHTML = agoHtml(c.lastInteraction);
  });
  on('company:changed', redrawRow);
  // a stage done or a meeting set moved the company to In process: move the row now, or after the popover closes
  on('company:moved', c => {
    if (!rowOf(c)) return;
    redrawRow(c);
    if (isPopoverOpen()) moveLater = true; else emit('render');
  });
  on('popover:closed', () => { if (moveLater && !location.hash) emit('render'); });
  on('meeting:changed', c => { const cell = rowOf(c)?.querySelector('.meet'); if (cell) cell.outerHTML = meetingHtml(c); });
  // a new stage reaches every company: redraw all rows, then bring the popover back
  on('stages:changed', ({ c }) => {
    if (location.hash) return;
    getState().companies.forEach(redrawRow);
    reopen(c);
  });
}
