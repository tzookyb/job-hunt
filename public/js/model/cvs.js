// CVs sent with applications. The shared library (`state.cvs`) lists every CV file ever uploaded; each company
// points at the one it got (`c.cv` = a library id, '' when none). Pure: no DOM, no I/O.
import { uid } from '../util.js';

export const PREVIEWABLE = /\.(pdf|png|jpe?g|txt|md)$/i;

// The stage the CV belongs to: the locked Application stage (older data: the first stage named like "Applied" /
// "Application", else the first stage).
export function applicationStageId(state) {
  const s = state.stages.find(x => x.locked) || state.stages.find(x => /^appl/i.test(String(x.name).trim())) || state.stages[0];
  return s ? s.id : null;
}

export const cvById = (state, id) => (id && state.cvs.find(x => x.id === id)) || null;
export const companyCv = (state, c) => cvById(state, c.cv);

// Adds an uploaded file to the library. The same stored file (same content) is never listed twice.
export function addCv(state, { file, size, name, type = '' }, day) {
  const existing = state.cvs.find(x => x.file === file);
  if (existing) return existing;
  const cv = { id: uid(), file, name: String(name || file), size: size || 0, type, addedAt: day };
  state.cvs.push(cv);
  return cv;
}

// Companies that were sent this CV.
export const cvUsage = (state, id) => state.companies.filter(c => c.cv === id);

// The library, newest first. Ties (same day) keep upload order, newest first.
export const cvsNewestFirst = state =>
  state.cvs.map((cv, i) => [cv, i]).sort((a, b) => (b[0].addedAt || '').localeCompare(a[0].addedAt || '') || b[1] - a[1]).map(([cv]) => cv);

// Forgets a library entry no company uses (the file itself stays in user-data/cvs/). Returns false if it's in use.
export function forgetCv(state, id) {
  if (cvUsage(state, id).length) return false;
  state.cvs = state.cvs.filter(x => x.id !== id);
  return true;
}

export function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
