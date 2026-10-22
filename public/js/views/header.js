// Top bar: save status and search.
import { $ } from '../dom.js';
import { on, emit } from '../bus.js';

const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

export function init() {
  on('status', ({ text, error }) => {
    const el = $('#saveStatus');
    el.textContent = text;
    el.classList.toggle('err', error);
  });
  $('#q').addEventListener('input', () => emit('render'));
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === '/' && !typing() && !location.hash) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && location.hash && !typing()) location.hash = '';
  });
  window.addEventListener('beforeunload', e => { if ($('#saveStatus').textContent === 'Saving…') e.preventDefault(); });
}
