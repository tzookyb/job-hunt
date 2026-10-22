// Top bar: save status, search and "+ Company".
import { $ } from '../dom.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { newCompany } from '../model/company.js';

const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);

export function init() {
  on('status', ({ text, error }) => {
    const el = $('#saveStatus');
    el.textContent = text;
    el.classList.toggle('err', error);
  });
  $('#q').addEventListener('input', () => emit('render'));
  $('#add').addEventListener('click', () => {
    const c = newCompany(getState());
    getState().companies.unshift(c);
    save();
    $('#q').value = '';
    location.hash = '#/c/' + c.id;
  });
  document.addEventListener('keydown', e => {
    if (e.key === '/' && !typing() && !location.hash) { e.preventDefault(); $('#q').focus(); }
    if (e.key === 'Escape' && location.hash && !typing()) location.hash = '';
  });
  window.addEventListener('beforeunload', e => { if ($('#saveStatus').textContent === 'Saving…') e.preventDefault(); });
}
