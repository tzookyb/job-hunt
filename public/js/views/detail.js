// The company page (#/c/<id>): every field, the stage list and notes.
import { esc } from '../util.js';
import { mainEl, delegate, $, $$, autosize } from '../dom.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { findCompany, removeCompany } from '../model/company.js';
import { companyOf, statusOptions, progressInner } from './common.js';
import { linkInput } from './fields.js';
import { stageListHtml } from './stageList.js';
import { notesHtml } from './notes.js';

let currentId = null;

export function renderDetail(id) {
  const c = findCompany(getState(), id);
  if (!c) { location.hash = ''; return; }
  currentId = id;
  const main = mainEl();
  main.innerHTML = `
  <div class="detail" data-id="${c.id}">
    <div class="dhead">
      <button class="btn ghost back">← All</button>
      <input class="title" data-f="name" value="${esc(c.name)}" placeholder="Company name">
      <select data-f="status">${statusOptions(c.status)}</select>
    </div>
    <div class="dprog st-${c.status}">${progressInner(c)}</div>
    <div class="grid">
      <label>Position<input class="field" data-f="position" value="${esc(c.position)}" placeholder="Role"></label>
      <span></span>
      <label>Website${linkInput(c, 'website', 'website')}</label>
      <label>Careers / job post${linkInput(c, 'careersUrl', 'link to the position')}</label>
      <label class="full">Comments<textarea class="field" data-f="comments" rows="2" placeholder="General notes about the position">${esc(c.comments)}</textarea></label>
    </div>
    <h2>Stages</h2>
    ${stageListHtml(c)}
    ${notesHtml(c)}
    <div class="dangerzone"><button class="btn ghost danger del-company">Delete company</button></div>
  </div>`;
  $$('textarea', main).forEach(autosize);
}

const visible = c => location.hash.startsWith('#/c/') && currentId === c.id;

export function init() {
  const main = mainEl();
  delegate(main, 'click', '.back', () => { location.hash = ''; });
  delegate(main, 'click', '.del-company', (e, el) => {
    const c = companyOf(el);
    if (!confirm(`Delete ${c.name || 'this company'}?`)) return;
    removeCompany(getState(), c.id); save(); location.hash = '';
  });
  on('company:changed', c => {
    if (!visible(c)) return;
    $('.stagelist', main).outerHTML = stageListHtml(c);
    const dp = $('.dprog', main);
    dp.className = `dprog st-${c.status}`;
    dp.innerHTML = progressInner(c);
  });
  on('field', ({ c, field }) => { if (field === 'status' && visible(c)) renderDetail(c.id); });
}
