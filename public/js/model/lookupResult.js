// What a lookup result does to a company. Pure: no DOM, no fetch.
//  - empty fields are filled (website, logo, research links, position from an analyzed job post);
//  - a filled field is never changed here: when the lookup has a *reliable* different value, it becomes a
//    suggestion the user can approve in the suggestions dialog;
//  - the AI notes go to `c.ai` (with `basis`: which job post they analyzed), replacing the old ones.
//    Nothing else the user writes (comments, notes, contacts…) is touched.
import { RESEARCH } from '../config.js';

// The lookup's own notes (server `log`) that mean "a guess": these values may fill an empty field, never replace one.
const UNRELIABLE = /naive address|not checked|not found/i;
export const reliableLink = note => !!note && !UNRELIABLE.test(note);

// URLs that mean the same page compare equal: no scheme, no www., no trailing slash, any case.
const sameUrl = (a, b) => {
  const n = u => String(u || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/#?]+$/, '');
  return n(a) === n(b);
};
const sameText = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

// A short, stable fingerprint of the pasted job post, to tell whether it changed since the last analysis.
export function textHash(s) {
  let h = 5381;
  for (const ch of String(s || '').trim()) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  return h.toString(36);
}

// The job post the next analysis would use (pasted text wins, as on the server).
export const jobBasis = c => ({ careersUrl: (c.careersUrl || '').trim(), jobHash: (c.jobText || '').trim() ? textHash(c.jobText) : '' });
export const hasJobInput = c => !!(jobBasis(c).careersUrl || jobBasis(c).jobHash);

// True when there's a job post the current AI notes haven't analyzed (→ show "Analyze this job post").
export function jobNeedsAnalysis(c) {
  if (!hasJobInput(c)) return false;
  const now = jobBasis(c), was = c.ai?.basis;
  return !c.ai || !was || was.careersUrl !== now.careersUrl || was.jobHash !== now.jobHash;
}

// Applies `result` (from /api/lookup or /api/ai/lookup) to `c`.
// `basis` = jobBasis(c) taken when the request was sent (the user may edit while it runs).
// → { filled: [label], suggestions: [{ field, label, from, to }], aiError }
export function applyLookup(c, result, { basis = jobBasis(c) } = {}) {
  const filled = [], suggestions = [];
  const offer = (field, label, value, reliable, same) => {
    if (!value) return;
    if (!c[field]) { c[field] = value; filled.push(label); return; }
    if (reliable && !same(c[field], value)) suggestions.push({ field, label, from: c[field], to: value });
  };

  offer('website', 'website', result.website, true, sameUrl);
  if (result.logo && !c.logo) { c.logo = result.logo; filled.push('logo'); }   // logos: fill only, never suggest
  for (const r of RESEARCH) offer(r.field, r.label, result.links?.[r.field], reliableLink(result.log?.[r.field]), sameUrl);

  if (result.ai) {
    c.ai = { ...result.ai, basis };
    offer('position', 'position', result.ai.job?.title, true, sameText);
    filled.push('AI notes');
  }
  return { filled, suggestions, aiError: result.aiError || '' };
}

// Applies the suggestions the user ticked.
export function acceptSuggestions(c, picked) {
  for (const s of picked) c[s.field] = s.to;
}
