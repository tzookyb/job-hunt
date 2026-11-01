// ⚙ AI settings: provider, model, API key and the "About you" profile used by the AI lookup. Only free providers
// are offered; picking one shows its "how to get a free key" guide (from server/ai/providers.js).
// The key field is write-only: it's never filled in, the page only learns whether a key is saved and its last 4
// characters. Saving with the key field empty keeps the saved key.
import { $ } from '../dom.js';
import { esc } from '../util.js';
import * as api from '../api.js';
import { getMode } from '../store.js';
import { emit } from '../bus.js';

const dlg = () => $('#aiDlg');
let saved = null;   // last GET/PUT /api/settings response

const WHERE = {
  env: 'Set by the JOB_HUNT_AI_KEY environment variable.',
  keychain: 'Saved in your macOS Keychain.',
  file: 'Saved in user-data/secrets.json, readable only by you.',
};

function message(text, error = false) {
  const el = $('#aiMsg');
  el.textContent = text;
  el.classList.toggle('err', error);
}

const current = () => saved.providers.find(p => p.id === $('#aiProvider').value);

// "How to get a free key": what's free, numbered steps, a link to the provider's key page, any privacy caveat.
// All text comes from our own provider table, and is escaped anyway.
const guide = p => `
  <div class="ai-free">${esc(p.free)}</div>
  <ol>${p.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol>
  <a class="btn" href="${esc(p.keyUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.keyLink)} ↗</a>
  ${p.privacy ? `<div class="ai-privacy">ⓘ ${esc(p.privacy)}</div>` : ''}`;

// Shows the guide, rows and key status that fit the provider picked in the dropdown.
function showProvider() {
  const p = current();
  $('#aiDetails').hidden = !p;
  if (!p) return;
  $('#aiGuide').innerHTML = guide(p);
  $('#aiModel').placeholder = p.model ? `Default: ${p.model}` : 'A model you have pulled, e.g. llama3.1:8b';
  $('#aiKeyRow').hidden = p.id === 'ollama';
  const k = saved.keys[p.id] || {};
  const key = $('#aiKey');
  key.value = '';
  key.disabled = k.keySource === 'env';
  key.placeholder = k.hasKey ? `${k.keyHint} saved. Paste a new key to replace it` : (p.needsKey ? 'Paste your API key' : 'API key (optional)');
  $('#aiKeyState').textContent = k.hasKey ? WHERE[k.keySource] || '' : (p.needsKey ? 'No key saved yet.' : '');
  $('#aiKeyRemove').hidden = !k.hasKey || k.keySource === 'env';
}

function fill(s) {
  saved = s;
  $('#aiProvider').innerHTML = '<option value="">None (AI lookup off)</option>' +
    s.providers.map(p => `<option value="${esc(p.id)}">${esc(p.label)}</option>`).join('');
  $('#aiProvider').value = s.provider;
  $('#aiModel').value = s.model;
  showProvider();
}

async function open() {
  if (getMode() !== 'server') return emit('status', { text: 'AI settings need the server (npm start)', error: true });
  try {
    const [s, profile] = await Promise.all([api.getSettings(), api.getProfile()]);
    fill(s);
    $('#aiProfile').value = profile;
    message('');
    dlg().showModal();
    $('#aiProvider').focus();
  } catch (e) { emit('status', { text: 'AI settings: ' + e.message, error: true }); }
}

// Saves the form. Resolves true on success; shows the error in the dialog otherwise.
async function save() {
  const provider = $('#aiProvider').value;
  const body = { provider, model: $('#aiModel').value.trim() };
  const key = $('#aiKey').value.trim();
  if (provider && key) body.apiKey = key;
  try {
    fill(await api.putSettings(body));
    await api.putProfile($('#aiProfile').value);
    return true;
  } catch (err) { message(err.message, true); return false; }
}

async function busy(fn) {
  const btns = [$('#aiSave'), $('#aiTest')];
  btns.forEach(b => { b.disabled = true; });
  try { await fn(); } finally { btns.forEach(b => { b.disabled = false; }); }
}

const saveAll = e => { e.preventDefault(); return busy(async () => {
  if (!(await save())) return;
  dlg().close();
  emit('status', { text: saved.provider ? 'AI settings saved ✓' : 'AI lookup off ✓', error: false });
}); };

// Saves, then asks the provider one tiny question: proves the key, the endpoint and the model in one go.
const testNow = () => busy(async () => {
  if (!$('#aiProvider').value) return message('Pick a provider first.', true);
  if (!(await save())) return;
  message('Testing…');
  try {
    const r = await api.testSettings();
    if (r.ok) message(`✓ Works: ${r.model} answered in ${(r.ms / 1000).toFixed(1)}s.`);
    else message(r.error, true);
  } catch (err) { message(err.message, true); }
});

async function removeKey() {
  const p = current();
  if (!p || !confirm(`Remove the saved ${p.label} key?`)) return;
  try {
    fill(await api.putSettings({ provider: p.id, apiKey: '' }));
    message('Key removed.');
  } catch (err) { message(err.message, true); }
}

export function init() {
  $('#aiBtn').addEventListener('click', open);
  $('#aiForm').addEventListener('submit', saveAll);
  $('#aiClose').addEventListener('click', () => dlg().close());
  $('#aiCancel').addEventListener('click', () => dlg().close());
  $('#aiKeyRemove').addEventListener('click', removeKey);
  $('#aiTest').addEventListener('click', testNow);
  $('#aiProvider').addEventListener('change', () => {
    if ($('#aiProvider').value !== saved.provider) $('#aiModel').value = '';   // a model name belongs to one provider
    else $('#aiModel').value = saved.model;
    showProvider();
    message('');
  });
  // the key never stays in the page after the dialog closes
  dlg().addEventListener('close', () => { $('#aiKey').value = ''; });
}
