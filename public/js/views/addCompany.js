// "+ Add Company": ask for the name → look it up behind a loader → open the company page.
// Also runs "↻ Look up" on a company page. Only fields that are still empty get filled.
import { $ } from '../dom.js';
import * as api from '../api.js';
import { getState, getMode, save } from '../store.js';
import { newCompany } from '../model/company.js';
import { RESEARCH } from '../config.js';

const LOOKUP_TIMEOUT = 60_000;
const FIELDS = [['website', 'website'], ['logo', 'logo'], ...RESEARCH.map(r => [r.field, r.label])];
let controller = null;

function showLoader(text) {
  $('#ldText').textContent = text;
  $('.ld-box').classList.remove('done');
  $('#ldSkip').hidden = false;
  $('#loader').hidden = false;
}

// Shows the result briefly, then hides the loader.
function hideLoader(message) {
  return new Promise(resolve => {
    if (!message || message === 'Skipped') { $('#loader').hidden = true; return resolve(); }
    $('#ldText').textContent = message;
    $('.ld-box').classList.add('done');
    $('#ldSkip').hidden = true;
    setTimeout(() => { $('#loader').hidden = true; resolve(); }, 900);
  });
}

// Copies found values into empty fields; returns the labels of what was filled.
export function fillEmpty(c, info) {
  const filled = [];
  for (const [field, label] of FIELDS) {
    const value = info[field] || info.links?.[field];
    if (value && !c[field]) { c[field] = value; filled.push(label); }
  }
  return filled;
}

export async function runLookup(c) {
  if (!c.name.trim()) return;
  if (getMode() !== 'server') return;
  showLoader(`Looking up ${c.name}…`);
  controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT);
  const info = await api.lookup(c.name, controller.signal);
  clearTimeout(timer);
  controller = null;
  const filled = info.error ? [] : fillEmpty(c, info);
  if (filled.length) save();
  await hideLoader(info.error || (filled.length ? 'Found: ' + filled.join(', ') : 'Nothing new found'));
}

export function init() {
  const dlg = $('#newDlg');
  $('#add').addEventListener('click', () => { $('#newName').value = ''; dlg.showModal(); $('#newName').focus(); });
  $('#newCancel').addEventListener('click', () => dlg.close());
  $('#newClose').addEventListener('click', () => dlg.close());
  $('#ldSkip').addEventListener('click', () => controller?.abort());
  dlg.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#newName').value.trim();
    if (!name) return $('#newName').focus();
    dlg.close();
    const c = newCompany(getState(), { name });
    getState().companies.unshift(c);
    $('#q').value = '';
    save();
    await runLookup(c);
    location.hash = '#/c/' + c.id;
  });
}
