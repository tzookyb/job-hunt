// ⤓ "Back up now": writes any pending edit first, then asks the server for a backup.
import { $ } from '../dom.js';
import * as api from '../api.js';
import { getMode, isSaving, writeNow } from '../store.js';
import { emit } from '../bus.js';

const status = (text, error = false) => emit('status', { text, error });

async function backupNow() {
  if (getMode() !== 'server') return status('Backups need the server (npm start)', true);
  const btn = $('#backupBtn');
  btn.disabled = true;
  try {
    if (isSaving()) await writeNow();
    status(`Backed up ✓ backups/${await api.backup()}`);
  } catch (e) { status('Backup failed: ' + e.message, true); }
  finally { btn.disabled = false; }
}

export function init() {
  $('#backupBtn').addEventListener('click', backupNow);
}
