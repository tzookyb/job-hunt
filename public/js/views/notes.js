// Free-text note sections on the company page, e.g. "Tech phone" → what they said they'll ask.
import { esc, uid } from '../util.js';
import { mainEl, delegate, autosize, $ } from '../dom.js';
import { getState, save } from '../store.js';
import { emit } from '../bus.js';
import { companyOf } from './common.js';

const EXTRA_TITLES = ['Questions to ask', 'About the company', 'Salary & conditions', 'Contacts'];

const noteHtml = n => `
  <div class="note" data-n="${n.id}">
    <div class="nt"><input data-nt list="noteTitles" value="${esc(n.title)}" placeholder="Section title"><button class="icon del-note" title="Remove section">✕</button></div>
    <textarea data-nb placeholder="Free text…">${esc(n.body)}</textarea>
  </div>`;

export function notesHtml(c) {
  const titles = [...getState().stages.map(s => s.name), ...EXTRA_TITLES];
  return `<div class="nhead"><h2>Notes</h2><button class="btn add-note">+ Add section</button></div>
    <datalist id="noteTitles">${titles.map(t => `<option value="${esc(t)}">`).join('')}</datalist>
    <div class="notes">${c.notes.length ? c.notes.map(noteHtml).join('')
      : '<div class="empty small">No sections yet. Add one, e.g. “Tech phone” → what they said you’ll be asked.</div>'}</div>`;
}

const noteOf = (c, el) => c.notes.find(n => n.id === el.closest('.note').dataset.n);

export function init() {
  const main = mainEl();
  delegate(main, 'click', '.add-note', (e, el) => {
    const c = companyOf(el), n = { id: uid(), title: '', body: '' };
    c.notes.push(n); save(); emit('render');
    $(`[data-n="${n.id}"] input`, main)?.focus();
  });
  delegate(main, 'click', '.del-note', (e, el) => {
    const c = companyOf(el), n = noteOf(c, el);
    if ((n.title || n.body) && !confirm('Remove this section?')) return;
    c.notes = c.notes.filter(x => x !== n); save(); emit('render');
  });
  delegate(main, 'input', '[data-nt], [data-nb]', (e, el) => {
    const n = noteOf(companyOf(el), el);
    if ('nt' in el.dataset) n.title = el.value; else { n.body = el.value; autosize(el); }
    save();
  });
}
