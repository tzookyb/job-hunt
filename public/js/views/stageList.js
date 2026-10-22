// A company's stages in its own order: done ✓, comment, "relevant" switch, reorder (drag ⋮⋮ or ↑↓) and
// "+ Add stage". Used by the progress popover and the company page.
import { esc, today } from '../util.js';
import { mainEl, delegate, $$ } from '../dom.js';
import { getState, save } from '../store.js';
import { emit } from '../bus.js';
import { addStage, moveBy, moveTo } from '../model/stages.js';
import { setStageDone } from '../model/company.js';
import { companyOf, stageName } from './common.js';

export function stageListHtml(c) {
  let n = 0;
  return `<div class="stagelist">
    <table class="stbl">
      <thead><tr><th></th><th>#</th><th>Done</th><th>Stage</th><th>Meeting</th><th>Comment</th><th>Relevant</th><th></th></tr></thead>
      <tbody>${c.order.map(id => { const x = c.stages[id]; return `
        <tr class="srow ${x.enabled ? '' : 'off'} ${x.done ? 'done' : ''}" data-stage="${id}">
          <td class="grip" title="Drag to reorder">⋮⋮</td>
          <td class="num">${x.enabled ? ++n : '–'}</td>
          <td><input type="checkbox" data-sd="${id}" ${x.done ? 'checked' : ''} ${x.enabled ? '' : 'disabled'}></td>
          <td class="sname">${esc(stageName(id))}</td>
          <td><input type="datetime-local" class="smeet ${x.meeting ? 'has' : ''}" data-sm="${id}" value="${esc(x.meeting || '')}" title="Scheduled meeting for this stage"></td>
          <td><input class="scomment" data-sc="${id}" value="${esc(x.comment)}" placeholder="comment…"></td>
          <td class="rel"><label class="switch" title="Does this company have this stage?"><input type="checkbox" data-se="${id}" ${x.enabled ? 'checked' : ''}><span></span></label></td>
          <td class="mv"><button class="icon up" title="Move up">↑</button><button class="icon down" title="Move down">↓</button></td>
        </tr>`; }).join('')}</tbody>
    </table>
    <div class="addstage"><input class="newstage" placeholder="+ Add stage (Enter)" title="New stages are added to all companies"></div>
  </div>`;
}

const changed = c => { save(); emit('company:changed', c); };

function initEditing(main) {
  delegate(main, 'change', 'input[data-sd]', (e, el) => {
    const c = companyOf(el);
    setStageDone(c, el.dataset.sd, el.checked, today());
    changed(c);
  });
  delegate(main, 'change', 'input[data-se]', (e, el) => {
    const c = companyOf(el);
    c.stages[el.dataset.se].enabled = el.checked;
    changed(c);
  });
  delegate(main, 'input', 'input[data-sc]', (e, el) => {
    companyOf(el).stages[el.dataset.sc].comment = el.value;
    save();
  });
  delegate(main, 'input', 'input[data-sm]', (e, el) => {
    const c = companyOf(el);
    c.stages[el.dataset.sm].meeting = el.value;
    el.classList.toggle('has', !!el.value);
    save();
    emit('meeting:changed', c);   // updates the Next meeting cell without redrawing this list
  });
  delegate(main, 'keydown', '.newstage', (e, el) => {
    if (e.key !== 'Enter' || !el.value.trim()) return;
    const c = companyOf(el);
    addStage(getState(), el.value, c);
    save();
    emit('stages:changed', { c, focusNew: true });
  });
}

function initReorder(main) {
  delegate(main, 'click', '.srow .up, .srow .down', (e, el) => {
    const c = companyOf(el), id = el.closest('.srow').dataset.stage;
    if (moveBy(c.order, c.order.indexOf(id), el.classList.contains('up') ? -1 : 1)) changed(c);
  });

  // drag & drop: rows only become draggable while the ⋮⋮ handle is held
  let drag = null;
  const clearMarks = () => $$('.drop-before,.drop-after', main).forEach(r => r.classList.remove('drop-before', 'drop-after'));
  delegate(main, 'mousedown', '.grip', (e, el) => { el.closest('.srow').draggable = true; });
  main.addEventListener('mouseup', () => $$('.srow[draggable=true]', main).forEach(r => { r.draggable = false; }));
  delegate(main, 'dragstart', '.srow', (e, row) => {
    drag = { c: companyOf(row), id: row.dataset.stage };
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', drag.id);
  });
  delegate(main, 'dragover', '.srow', (e, row) => {
    if (!drag || companyOf(row) !== drag.c) return;
    e.preventDefault();
    clearMarks();
    const r = row.getBoundingClientRect();
    row.classList.add(e.clientY > r.top + r.height / 2 ? 'drop-after' : 'drop-before');
  });
  delegate(main, 'drop', '.srow', (e, row) => {
    if (!drag || companyOf(row) !== drag.c) return;
    e.preventDefault();
    const { c, id } = drag;
    c.order = moveTo(c.order, id, row.dataset.stage, row.classList.contains('drop-after'));
    drag = null;
    changed(c);
  });
  main.addEventListener('dragend', () => {
    clearMarks();
    $$('.srow', main).forEach(r => { r.classList.remove('dragging'); r.draggable = false; });
    drag = null;
  });
}

export const isDraggingStage = () => !!document.querySelector('.srow.dragging');

export function init() {
  const main = mainEl();
  initEditing(main);
  initReorder(main);
}
