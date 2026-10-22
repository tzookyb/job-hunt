// Creating and changing companies. Pure functions over the app state.
import { uid } from '../util.js';
import { blankStage } from './normalize.js';

export function newCompany(state, fields = {}) {
  // a new company is not an interaction: lastInteraction stays empty until something happens
  const c = { id: uid(), name: '', position: '', website: '', careersUrl: '', comments: '', status: 'active',
    lastInteraction: '', closeReason: '', contact: '', recruiterUrl: '', glassdoorUrl: '',
    order: state.stages.map(s => s.id), stages: {}, notes: [], createdAt: Date.now(), ...fields };
  for (const s of state.stages) c.stages[s.id] = blankStage();
  return c;
}

// Ticking a stage as done counts as an interaction today.
export function setStageDone(c, stageId, done, day) {
  c.stages[stageId].done = done;
  if (done) c.lastInteraction = day;
}

export const findCompany = (state, id) => state.companies.find(c => c.id === id);

export function removeCompany(state, id) {
  state.companies = state.companies.filter(c => c.id !== id);
}
