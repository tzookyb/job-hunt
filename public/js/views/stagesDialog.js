// "Stages" dialog: rename, reorder and delete the shared stage list; apply its order to every company.
import { esc } from '../util.js';
import { $, delegate } from '../dom.js';
import { getState, save } from '../store.js';
import { emit } from '../bus.js';
import { addStage, deleteStage, moveBy, applyOrderToAll } from '../model/stages.js';

const dlg = () => $('#stagesDlg');

function render() {
  $('#gsList').innerHTML = getState().stages.map(s => `
    <div class="gs" data-g="${s.id}">
      <input class="field" value="${esc(s.name)}">
      <label class="switch" title="On by default for new companies"><input type="checkbox" class="gdef" ${s.defaultOn ? 'checked' : ''}><span></span></label>
      <button class="icon gup" title="Move up">↑</button><button class="icon gdown" title="Move down">↓</button>
      <button class="icon gdel" title="Delete from all companies">✕</button>
    </div>`).join('');
}

const stageOfRow = el => getState().stages.find(s => s.id === el.closest('.gs').dataset.g);

export function init() {
  const d = dlg();
  $('#stagesBtn').addEventListener('click', () => { render(); d.showModal(); });
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
    if (!confirm(`Delete “${s.name}” from all companies? Their ✓ and comments on it are lost.`)) return;
    deleteStage(getState(), s.id); save(); render();
  });
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
