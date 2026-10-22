// Owns the app state and persistence: the server when it's running, the browser's localStorage otherwise.
import * as api from './api.js';
import { normalize } from './model/normalize.js';
import { emit } from './bus.js';

const LOCAL_KEY = 'jobTracker';
const SAVE_DELAY = 350;

let state = null;
let mode = 'server';   // 'server' → data.json · 'local' → localStorage fallback
let timer = null;

export const getState = () => state;
export const getMode = () => mode;
export const isSaving = () => timer !== null;

const status = (text, error = false) => emit('status', { text, error });

export async function load() {
  let raw;
  try {
    raw = await api.getData();
    status('Saved to data.json');
  } catch {
    mode = 'local';
    try { raw = JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch { raw = null; }
    status('No server — saving in this browser only', true);
  }
  const { data, migrated } = normalize(raw);
  state = data;
  if (migrated) save();
  return state;
}

// Debounced save: call it after every change.
export function save() {
  status('Saving…');
  clearTimeout(timer);
  timer = setTimeout(writeNow, SAVE_DELAY);
}

export async function writeNow() {
  clearTimeout(timer);
  timer = null;
  state.updatedAt = Date.now();
  const body = JSON.stringify(state, null, 2);
  if (mode === 'server') {
    try { await api.putData(body); status('Saved ✓'); }
    catch { status('Save failed — is the server running?', true); }
  } else {
    try { localStorage.setItem(LOCAL_KEY, body); status('Saved in browser ✓'); }
    catch { status('Save failed', true); }
  }
}
