// Brings any saved data (old or partial) up to the current shape. Pure: no DOM, no I/O.
// Every schema change must be handled here, so old data always loads.
import { uid } from '../util.js';
import { DEFAULT_STAGES, STATUSES, OLD_STATUS } from '../config.js';

export const blankStage = (enabled = true) => ({ enabled, done: false, comment: '' });

// Returns { data, migrated }. `migrated` = an upgrade changed the data and it should be saved once.
export function normalize(raw) {
  const d = raw && typeof raw === 'object' ? structuredClone(raw) : {};
  let migrated = false;
  if (!Array.isArray(d.stages) || !d.stages.length) {
    d.stages = DEFAULT_STAGES.map((name, i) => ({ id: uid(), name, defaultOn: i < 2 }));
    d.stageDefaultsV2 = true;
  }
  if (!Array.isArray(d.companies)) d.companies = [];
  if (!d.stageDefaultsV2) { upgradeStageDefaults(d); migrated = true; }
  d.stages.forEach(s => { s.defaultOn = !!s.defaultOn; });
  const ids = d.stages.map(s => s.id);
  const defaultOn = id => d.stages.find(s => s.id === id).defaultOn;
  for (const c of d.companies) {
    if (!c.stages || typeof c.stages !== 'object' || Array.isArray(c.stages)) c.stages = {};
    // each company keeps its own stage order; stages it doesn't know yet go at the end
    c.order = (Array.isArray(c.order) ? c.order : []).filter(id => ids.includes(id));
    for (const id of ids) {
      if (!c.order.includes(id)) c.order.push(id);
      c.stages[id] = { ...blankStage(defaultOn(id)), ...c.stages[id] };
    }
    for (const f of ['name', 'position', 'website', 'careersUrl', 'comments', 'lastInteraction', 'closeReason', 'contact', 'recruiterUrl', 'glassdoorUrl', 'logo']) c[f] = c[f] || '';
    c.notes = Array.isArray(c.notes) ? c.notes : [];
    c.status = OLD_STATUS[c.status] || c.status;
    if (!STATUSES.some(([k]) => k === c.status)) c.status = 'active';
  }
  return { data: d, migrated };
}

// One-time upgrade (v2): only "Applied" and "HR Initial" are on by default. Companies that aren't past HR Initial
// get their other stages switched off — except stages that already have a ✓, a meeting or a comment.
function upgradeStageDefaults(d) {
  const picked = d.stages.filter(s => /^(applied|hr initial|hr phone)$/i.test(String(s.name).trim()));
  const on = (picked.length ? picked : d.stages.slice(0, 2)).map(s => s.id);
  d.stages.forEach(s => { s.defaultOn = on.includes(s.id); });
  for (const c of d.companies) {
    if (!c.stages || typeof c.stages !== 'object') continue;
    const pastFirst = Object.entries(c.stages).some(([id, x]) => x?.done && id !== on[0]);
    if (pastFirst) continue;
    for (const [id, x] of Object.entries(c.stages)) {
      if (x && !on.includes(id) && !x.done && !x.meeting && !x.comment) x.enabled = false;
    }
  }
  d.stageDefaultsV2 = true;
}
