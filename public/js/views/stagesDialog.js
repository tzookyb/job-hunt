// "Hiring Stages" dialog: rename, reorder, set defaults and delete the shared stage list; apply its order to every
// company. Deleting a stage that companies have data on lists them first: click one to go sort it out, or delete
// anyway.
import { esc } from '../util.js';
import { $, delegate } from '../dom.js';
import { getState, save } from '../store.js';
import { emit } from '../bus.js';
import { addStage, deleteStage, moveBy, applyOrderToAll, stageUsage } from '../model/stages.js';
import { focusStageOnOpen } from './detail.js';

const dlg = () => $('#stagesDlg');
const warning = () => $('#gsWarn');

function render() {
  $('#gsList').innerHTML = getState().stages.map(s => `
    <div class="gs" data-g="${s.id}">
      <input class="field" value="${esc(s.name)}">
      <label class="switch" title="On by default for new companies"><input type="checkbox" class="gdef" ${s.defaultOn ? 'checked' : ''}><span></span></label>
      <button class="icon gup" title="Move up">↑</button><button class="icon gdown" title="Move down">↓</button>
      <button class="icon gdel" title="Delete from all companies">✕</button>
    </div>`).join('');
}

// "marked done · meeting 24 Oct, 10:30 · comment “ask about…”"
function describe({ done, meeting, comment }) {
  const what = [];
  if (done) what.push('marked done');
  if (meeting) what.push('meeting ' + new Date(meeting).toLocaleString(undefined, { day: 'numeric', month: 'short', ...(meeting.length > 10 ? { hour: '2-digit', minute: '2-digit' } : {}) }));
  if (comment) what.push(`comment “${comment.length > 40 ? comment.slice(0, 40) + '…' : comment}”`);
  return what.join(' · ');
}

function showWarning(stage, usage) {
  const w = warning();
  w.dataset.stage = stage.id;
  w.innerHTML = `<div class="gw-title">⚠ “${esc(stage.name)}” has data in ${usage.length} ${usage.length === 1 ? 'company' : 'companies'}</div>
    <div class="hint">Deleting it removes this from all of them. Click a company to open it and sort it out first.</div>
    <ul>${usage.map(u => `<li><button class="gw-go" data-cid="${u.company.id}">${esc(u.company.name || 'Untitled')}</button> <span class="muted">${esc(describe(u))}</span></li>`).join('')}</ul>
    <div class="gw-act"><button class="btn ghost gw-cancel">Cancel</button><button class="btn danger gw-force">Delete anyway, lose this data</button></div>`;
  w.hidden = false;
  w.scrollIntoView({ block: 'nearest' });
}

function remove(id) {
  deleteStage(getState(), id);
  warning().hidden = true;
  save(); render();
}

const stageOfRow = el => getState().stages.find(s => s.id === el.closest('.gs').dataset.g);

function initWarning(d) {
  delegate(d, 'click', '.gw-go', (e, el) => {
    focusStageOnOpen(warning().dataset.stage);
    warning().hidden = true;
    location.hash = '#/c/' + el.dataset.cid;
    d.close();
  });
  delegate(d, 'click', '.gw-cancel', () => { warning().hidden = true; });
  delegate(d, 'click', '.gw-force', () => {
    const s = getState().stages.find(x => x.id === warning().dataset.stage);
    if (s && confirm(`Delete “${s.name}” and its data in every company? This can't be undone (except from a backup).`)) remove(s.id);
  });
}

export function init() {
  const d = dlg();
  $('#stagesBtn').addEventListener('click', () => { warning().hidden = true; render(); d.showModal(); });
  d.addEventListener('close', () => emit('render'));
  delegate(d, 'click', '#dlgClose', () => d.close());
  d.addEventListener('click', e => { if (e.target === d) d.close(); });

  delegate(d, 'input', '.gs .field', (e, el) => { stageOfRow(el).name = el.value; save(); });
  delegate(d, 'change', '.gs .gdef', (e, el) => { stageOfRow(el).defaultOn = el.checked; save(); });
  delegate(d, 'click', '.gup, .gdown', (e, el) => {
    const { stages } = getState();
    if (moveBy(stages, stages.indexOf(stageOfRow(el)), el.classList.contains('gup') ? -1 : 1)) { save(); render(); }
  });
  delegate(d, 'click', '.gdel', (e, el) => {
    const s = stageOfRow(el);
    if (getState().stages.length === 1) return alert('Keep at least one stage.');
    const usage = stageUsage(getState(), s.id);
    if (usage.length) return showWarning(s, usage);   // companies would lose data → list them first
    if (confirm(`Remove “${s.name}” from all companies? No company has anything saved on it.`)) remove(s.id);
  });
  initWarning(d);
  delegate(d, 'click', '#applyOrder', () => {
    if (!confirm('Reset every company’s stage order to this order?')) return;
    applyOrderToAll(getState()); save();
  });
  $('#gsNew').addEventListener('keydown', e => {
    if (e.key !== 'Enter' || !e.target.value.trim()) return;
    addStage(getState(), e.target.value); e.target.value = '';
    save(); render();
  });
}
