// After a lookup: fields the user already filled where the lookup found a different, reliable value.
// One row per field, "yours → found", unticked; nothing changes unless ticked and applied (owner's decision).
import { $ } from '../dom.js';
import { esc } from '../util.js';

const dlg = () => $('#sugDlg');
// Links lose "https://www." so the part that differs is visible; the full value is in the tooltip.
const shown = v => String(v).replace(/^https?:\/\/(www\.)?/i, '');
let pending = null;   // { suggestions, resolve }

// Resolves the suggestions the user ticked ([] when closed or "Keep mine").
export function askSuggestions(c, suggestions) {
  if (!suggestions.length) return Promise.resolve([]);
  $('#sugTitle').textContent = `${c.name}: the lookup found different values`;
  $('#sugList').innerHTML = suggestions.map((s, i) => `
    <label class="sug">
      <input type="checkbox" data-i="${i}">
      <span class="sug-field">${esc(s.label)}</span>
      <span class="sug-from" title="${esc(s.from)}">${esc(shown(s.from))}</span>
      <span class="sug-arrow">→</span>
      <span class="sug-to" title="${esc(s.to)}">${esc(shown(s.to))}</span>
    </label>`).join('');
  syncApply();
  dlg().returnValue = '';
  dlg().showModal();
  return new Promise(resolve => { pending = { suggestions, resolve }; });
}

function syncApply() {
  const n = dlg().querySelectorAll('#sugList input:checked').length;
  $('#sugApply').disabled = !n;
  $('#sugApply').textContent = n ? `Apply ${n} change${n > 1 ? 's' : ''}` : 'Apply selected';
}

export function init() {
  dlg().addEventListener('change', syncApply);
  $('#sugKeep').addEventListener('click', () => dlg().close('keep'));
  $('#sugClose').addEventListener('click', () => dlg().close('keep'));
  $('#sugApply').addEventListener('click', () => dlg().close('apply'));
  dlg().addEventListener('close', () => {
    if (!pending) return;
    const { suggestions, resolve } = pending;
    pending = null;
    const picked = dlg().returnValue === 'apply'
      ? [...dlg().querySelectorAll('#sugList input:checked')].map(el => suggestions[+el.dataset.i]) : [];
    resolve(picked);
  });
}
