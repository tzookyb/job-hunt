// The CV sent with an application. It sits on the company's Application stage row (stage list and the sheet's
// progress popover): drop a file on the row, or click "📎 CV" to upload one or reuse one you sent before.
// Each version is stored as-is in user-data/cvs/, so you can always see exactly what a company got.
// Clicking the chip previews it (views/cvPreview.js).
import { esc, today } from '../util.js';
import { mainEl, delegate, $ } from '../dom.js';
import { getState, getMode, save } from '../store.js';
import { emit } from '../bus.js';
import { uploadCv } from '../api.js';
import { companyOf } from './common.js';
import { companyCv, addCv, cvUsage, cvsNewestFirst, forgetCv, formatSize, applicationStageId } from '../model/cvs.js';

export const CV_ACCEPT = '.pdf,.doc,.docx,.odt,.rtf,.pages,.txt,.md,.png,.jpg,.jpeg';
const OK_EXT = new RegExp(`(${CV_ACCEPT.split(',').map(x => '\\' + x).join('|')})$`, 'i');

const uploading = new Set();   // company ids with an upload in progress
let menu = null;

export const isCvStage = id => id === applicationStageId(getState());

const day = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';

// The CV slot inside the Application row's name cell.
export function cvSlotHtml(c) {
  if (uploading.has(c.id)) return '<span class="cvslot"><span class="cvbusy">Uploading CV…</span></span>';
  const cv = companyCv(getState(), c);
  if (!cv) return '<span class="cvslot"><button class="cvadd" title="Attach the CV you sent: click, or drop a file on this row">📎 CV</button></span>';
  return `<span class="cvslot has"><button class="cvchip" data-cvopen="${cv.id}" title="Preview ${esc(cv.name)} (Space)"><span class="cvic">📄</span><span class="cvn">${esc(cv.name)}</span></button><button class="icon cvmore" title="Change or remove the CV" aria-label="Change or remove the CV">▾</button></span>`;
}

const changed = c => emit('company:changed', c);

async function attachFile(c, file) {
  if (!file) return;
  if (!OK_EXT.test(file.name)) return alert(`“${file.name}” isn’t a CV file this app keeps.\nUse PDF, Word, Pages, RTF, ODT, text or an image.`);
  if (getMode() !== 'server') return alert('CV files are stored by the local server, which isn’t running.');
  closeMenu();
  uploading.add(c.id); changed(c);
  try {
    const { file: stored, size } = await uploadCv(file);
    const cv = addCv(getState(), { file: stored, size, name: file.name, type: file.type }, today());
    c.cv = cv.id;
    save();
  } catch (e) {
    alert('Couldn’t upload the CV: ' + e.message);
  } finally {
    uploading.delete(c.id); changed(c);
  }
}

// ---- menu: upload, reuse a previous CV, remove ----

function menuHtml(c) {
  const state = getState(), list = cvsNewestFirst(state);
  const items = list.map(cv => {
    const sent = cvUsage(state, cv.id).filter(x => x !== c).map(x => x.name || 'Untitled');
    const meta = [day(cv.addedAt), formatSize(cv.size), sent.length ? 'sent to ' + sent.join(', ') : ''].filter(Boolean).join(' · ');
    const unused = !cvUsage(state, cv.id).length;
    return `<li class="${c.cv === cv.id ? 'cur' : ''}">
      <button class="cvm-pick" data-cv="${cv.id}" title="Use this CV for ${esc(c.name || 'this company')}"><b>${esc(cv.name)}</b><small>${esc(meta)}</small></button>
      <button class="icon cvm-peek" data-cvopen="${cv.id}" title="Preview">👁</button>
      ${unused ? `<button class="icon cvm-forget" data-cv="${cv.id}" title="Remove from this list (the file stays in user-data/cvs)">✕</button>` : ''}
    </li>`;
  }).join('');
  return `<div class="cvm-h">CV sent to ${esc(c.name || 'this company')}</div>
    <button class="btn cvm-upload">⬆ Upload a file…</button><span class="hint cvm-or">or drop one on the ${esc(stageLabel())} row</span>
    <input type="file" class="cvm-file" accept="${CV_ACCEPT}" hidden>
    ${items ? `<div class="cvm-sub">Reuse one you sent before</div><ul class="cvm-list">${items}</ul>` : ''}
    ${c.cv ? '<div class="cvm-f"><button class="btn ghost danger cvm-remove">Remove from this company</button></div>' : ''}`;
}

const stageLabel = () => (getState().stages.find(s => s.id === applicationStageId(getState())) || {}).name || 'Application';

function openMenu(c, anchor) {
  closeMenu();
  menu = document.createElement('div');
  menu.className = 'cvmenu';
  menu.dataset.id = c.id;
  menu.innerHTML = menuHtml(c);
  mainEl().appendChild(menu);
  const r = anchor.getBoundingClientRect(), h = menu.offsetHeight, w = menu.offsetWidth;
  const below = r.bottom + 6 + h <= window.innerHeight || r.top < h + 8;
  menu.style.top = Math.max(8, below ? r.bottom + 6 : r.top - h - 6) + 'px';
  menu.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
}

function closeMenu() { menu?.remove(); menu = null; }

// ---- drag & drop a file onto the Application row ----

const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');

function initDrop(main) {
  let depth = 0;
  const setDragging = on => document.body.classList.toggle('file-drag', on);
  // a file dropped anywhere else must not make the browser navigate away from the app
  window.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
  window.addEventListener('drop', e => { if (hasFiles(e)) { e.preventDefault(); depth = 0; setDragging(false); } });
  window.addEventListener('dragenter', e => { if (hasFiles(e)) { depth++; setDragging(true); } });
  window.addEventListener('dragleave', e => { if (hasFiles(e) && --depth <= 0) { depth = 0; setDragging(false); } });

  delegate(main, 'dragover', '.srow.cv-row', (e, row) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    row.classList.add('cv-over');
  });
  delegate(main, 'dragleave', '.srow.cv-row', (e, row) => { if (!row.contains(e.relatedTarget)) row.classList.remove('cv-over'); });
  delegate(main, 'drop', '.srow.cv-row', (e, row) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    row.classList.remove('cv-over');
    attachFile(companyOf(row), e.dataTransfer.files[0]);
  });
}

export function init() {
  const main = mainEl();
  initDrop(main);
  delegate(main, 'click', '.cvadd, .cvmore', (e, el) => {
    e.stopPropagation();
    const c = companyOf(el);
    if (menu && menu.dataset.id === c.id) return closeMenu();
    openMenu(c, el.closest('.cvslot'));
  });
  delegate(main, 'click', '.cvm-upload', (e, el) => $('.cvm-file', el.closest('.cvmenu')).click());
  delegate(main, 'change', '.cvm-file', (e, el) => attachFile(companyOf(el), el.files[0]));
  delegate(main, 'click', '.cvm-pick', (e, el) => {
    const c = companyOf(el);
    c.cv = el.dataset.cv;
    closeMenu(); save(); changed(c);
  });
  delegate(main, 'click', '.cvm-forget', (e, el) => {
    const c = companyOf(el);
    if (!forgetCv(getState(), el.dataset.cv)) return;
    save();
    menu.innerHTML = menuHtml(c);
  });
  delegate(main, 'click', '.cvm-remove', (e, el) => {
    const c = companyOf(el);
    c.cv = '';
    closeMenu(); save(); changed(c);
  });
  document.addEventListener('mousedown', e => {
    if (menu && !menu.contains(e.target) && !e.target.closest('.cvadd, .cvmore, .ql')) closeMenu();
  });
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && menu && !document.querySelector('.ql')) { e.stopImmediatePropagation(); closeMenu(); }
  }, true);
  document.addEventListener('scroll', e => { if (menu && !menu.contains(e.target)) closeMenu(); }, true);
}
