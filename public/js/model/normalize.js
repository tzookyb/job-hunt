// Brings any saved data (old or partial) up to the current shape. Pure: no DOM, no I/O.
// Every schema change must be handled here, so old data always loads.
import { uid } from '../util.js';
import { DEFAULT_STAGES, STATUSES, OLD_STATUS, RESEARCH } from '../config.js';
import { blankContact, upgradeContacts, upgradeWhatsapp } from './contacts.js';
import { blankAction } from './action.js';

export const blankStage = (enabled = true) => ({ enabled, done: false, comment: '' });

// Returns { data, migrated }. `migrated` = an upgrade changed the data and it should be saved once.
export function normalize(raw) {
  const d = raw && typeof raw === 'object' ? structuredClone(raw) : {};
  let migrated = false;
  if (!Array.isArray(d.stages) || !d.stages.length) {
    d.stages = DEFAULT_STAGES.map((name, i) => ({ id: uid(), name, defaultOn: i < 2, ...(i ? {} : { locked: true }) }));
    d.stageDefaultsV2 = true;
  }
  if (!Array.isArray(d.companies)) d.companies = [];
  if (!Array.isArray(d.bookmarks)) d.bookmarks = [];
  d.cvs = Array.isArray(d.cvs) ? d.cvs.filter(x => x && x.id && x.file) : [];
  if (!d.stageDefaultsV2) { upgradeStageDefaults(d); migrated = true; }
  if (lockApplicationStage(d)) migrated = true;
  d.stages.forEach(s => { s.defaultOn = !!s.defaultOn; });
  const ids = d.stages.map(s => s.id);
  const locked = d.stages[0].id;   // lockApplicationStage() put it first
  const defaultOn = id => d.stages.find(s => s.id === id).defaultOn;
  for (const c of d.companies) {
    if (!c.stages || typeof c.stages !== 'object' || Array.isArray(c.stages)) c.stages = {};
    // each company keeps its own stage order; stages it doesn't know yet go at the end
    c.order = (Array.isArray(c.order) ? c.order : []).filter(id => ids.includes(id));
    for (const id of ids) {
      if (!c.order.includes(id)) c.order.push(id);
      c.stages[id] = { ...blankStage(defaultOn(id)), ...c.stages[id] };
    }
    // the locked Application stage: first, and on, for every company
    c.order = [locked, ...c.order.filter(id => id !== locked)];
    c.stages[locked].enabled = true;
    for (const f of ['name', 'position', 'website', 'careersUrl', 'comments', 'lastInteraction', 'closeReason', 'logo', 'statusSince', ...RESEARCH.map(r => r.field)]) c[f] = c[f] || '';
    c.jobText = typeof c.jobText === 'string' ? c.jobText : '';   // a pasted job post (AI lookup)
    c.ai = c.ai && typeof c.ai === 'object' && !Array.isArray(c.ai) ? c.ai : null;   // read-only AI notes
    c.notes = Array.isArray(c.notes) ? c.notes : [];
    c.action = { ...blankAction(), ...(c.action && typeof c.action === 'object' ? c.action : {}) };
    c.actionLog = Array.isArray(c.actionLog) ? c.actionLog : [];
    c.cv = d.cvs.some(x => x.id === c.cv) ? c.cv : '';
    if (upgradeContacts(c)) migrated = true;
    if (!c.contacts.length) c.contacts.push(blankContact());
    c.contacts = c.contacts.map(x => ({ ...blankContact(), ...x }));
    for (const x of c.contacts) if (upgradeWhatsapp(x)) migrated = true;
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

// The Application stage is locked (owner's rule): exactly one stage has `locked: true`, it is first in the shared
// list and on by default. The first time, it is the stage named like "Applied" / "Application" (else a new
// "Application" stage). Returns true when that first-time upgrade ran, so the page saves once.
function lockApplicationStage(d) {
  let s = d.stages.find(x => x.locked);
  const upgraded = !s;
  if (!s) {
    s = d.stages.find(x => /^appl/i.test(String(x.name).trim()));
    if (!s) { s = { id: uid(), name: 'Application', defaultOn: true }; d.stages.unshift(s); }
  }
  d.stages.forEach(x => { if (x !== s) delete x.locked; });
  s.locked = true;
  s.defaultOn = true;
  d.stages = [s, ...d.stages.filter(x => x !== s)];
  return upgraded;
}
