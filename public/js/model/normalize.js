// Brings any saved data (old or partial) up to the current shape. Pure: no DOM, no I/O.
// Every schema change must be handled here, so old data always loads.
import { uid } from '../util.js';
import { DEFAULT_STAGES, STATUSES } from '../config.js';

export const blankStage = (enabled = true) => ({ enabled, done: false, comment: '' });

// Returns { data, migrated }. `migrated` = an upgrade changed the data and it should be saved once.
export function normalize(raw) {
  const d = raw && typeof raw === 'object' ? structuredClone(raw) : {};
  const migrated = false;
  if (!Array.isArray(d.stages) || !d.stages.length) d.stages = DEFAULT_STAGES.map(name => ({ id: uid(), name }));
  if (!Array.isArray(d.companies)) d.companies = [];
  const ids = d.stages.map(s => s.id);
  for (const c of d.companies) {
    if (!c.stages || typeof c.stages !== 'object' || Array.isArray(c.stages)) c.stages = {};
    // each company keeps its own stage order; stages it doesn't know yet go at the end
    c.order = (Array.isArray(c.order) ? c.order : []).filter(id => ids.includes(id));
    for (const id of ids) {
      if (!c.order.includes(id)) c.order.push(id);
      c.stages[id] = { ...blankStage(), ...c.stages[id] };
    }
    for (const f of ['name', 'position', 'website', 'careersUrl', 'comments', 'lastInteraction', 'closeReason', 'contact', 'recruiterUrl', 'glassdoorUrl']) c[f] = c[f] || '';
    c.notes = Array.isArray(c.notes) ? c.notes : [];
    if (!STATUSES.some(([k]) => k === c.status)) c.status = 'active';
  }
  return { data: d, migrated };
}
