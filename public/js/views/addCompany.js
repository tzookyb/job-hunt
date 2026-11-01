// "+ Add Company": ask for the name (and optionally the job post) → look it up behind a loader → open the company
// page. Also runs "↻ Look up" / "↻ Re-analyze" on a company page. With an AI provider set up (⚙) the AI lookup runs
// (plain results + AI notes); otherwise, or when the server says it's off, the plain lookup. Empty fields are filled;
// filled fields only change through the suggestions dialog (model/lookupResult.js).
import { $ } from '../dom.js';
import * as api from '../api.js';
import { getState, getMode, save } from '../store.js';
import { newCompany } from '../model/company.js';
import { applyLookup, acceptSuggestions, jobBasis } from '../model/lookupResult.js';
import { askSuggestions } from './suggestDialog.js';
import { noteAiError } from './aiNotes.js';
import { RESEARCH, STATUSES } from '../config.js';

const NEW_STATUS = 'interested';   // most companies start as "thinking of applying"

const LOOKUP_TIMEOUT = 60_000, AI_TIMEOUT = 150_000;   // the AI lookup = the plain lookup + one model request
const FIELDS = [['website', 'website'], ['logo', 'logo'], ...RESEARCH.map(r => [r.field, r.label])];
let controller = null;

function showLoader(text) {
  $('#ldText').textContent = text;
  $('.ld-box').classList.remove('done');
  $('#ldSkip').hidden = false;
  $('#loader').hidden = false;
}

// Shows the result briefly, then hides the loader.
function hideLoader(message, linger = 900) {
  return new Promise(resolve => {
    if (!message || message === 'Skipped') { $('#loader').hidden = true; return resolve(); }
    $('#ldText').textContent = message;
    $('.ld-box').classList.add('done');
    $('#ldSkip').hidden = true;
    setTimeout(() => { $('#loader').hidden = true; resolve(); }, linger);
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

// Runs the lookup for `c`, fills empty fields, stores the AI notes, then offers suggestions for filled fields.
export async function runLookup(c) {
  if (!c.name.trim()) return;
  if (getMode() !== 'server') return;
  const basis = jobBasis(c);   // the job post as sent (the user may keep typing while it runs)
  showLoader(`Looking up ${c.name}…`);
  controller = new AbortController();
  let timer = setTimeout(() => controller.abort(), AI_TIMEOUT);
  let info = await api.aiLookup({ name: c.name, website: c.website, careersUrl: c.careersUrl, jobText: c.jobText }, controller.signal);
  clearTimeout(timer);
  if (info.off) {   // no AI set up: the plain lookup, as before
    timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT);
    info = await api.lookup(c.name, controller.signal);
    clearTimeout(timer);
  }
  controller = null;
  if (info.error) return hideLoader(info.error);

  const { filled, suggestions, aiError } = applyLookup(c, info, { basis });
  noteAiError(c.id, aiError ? 'AI notes not updated: ' + aiError : '');
  if (filled.length) save();
  const found = filled.length ? 'Found: ' + filled.join(', ') : 'Nothing new found';
  await hideLoader(aiError ? `${found} · AI failed: ${aiError}` : found, aiError ? 2500 : 900);

  const picked = await askSuggestions(c, suggestions);
  if (picked.length) { acceptSuggestions(c, picked); save(); }
}

export function init() {
  const dlg = $('#newDlg');
  $('#newStatus').innerHTML = STATUSES.map(([k, label]) => `<option value="${k}">${label}</option>`).join('');
  $('#add').addEventListener('click', () => {
    $('#newName').value = '';
    $('#newJob').value = '';
    $('#newJobText').value = '';
    $('#newPaste').open = false;
    $('#newStatus').value = NEW_STATUS;
    dlg.showModal();
    $('#newName').focus();
  });
  $('#newCancel').addEventListener('click', () => dlg.close());
  $('#newClose').addEventListener('click', () => dlg.close());
  $('#ldSkip').addEventListener('click', () => controller?.abort());
  dlg.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#newName').value.trim();
    if (!name) return $('#newName').focus();
    dlg.close();
    const job = $('#newJob').value.trim(), jobText = $('#newJobText').value.trim();
    const c = newCompany(getState(), { name, status: $('#newStatus').value, careersUrl: job, jobText });
    getState().companies.unshift(c);
    $('#q').value = '';
    save();
    await runLookup(c);
    location.hash = '#/c/' + c.id;
  });
}
