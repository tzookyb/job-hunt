// Creating and changing companies. Pure functions over the app state.
import { uid } from '../util.js';
import { blankStage } from './normalize.js';

export function newCompany(state, fields = {}) {
  const c = { id: uid(), name: '', position: '', website: '', careersUrl: '', comments: '', status: 'active',
    order: state.stages.map(s => s.id), stages: {}, notes: [], createdAt: Date.now(), ...fields };
  for (const s of state.stages) c.stages[s.id] = blankStage();
  return c;
}

export const findCompany = (state, id) => state.companies.find(c => c.id === id);

export function removeCompany(state, id) {
  state.companies = state.companies.filter(c => c.id !== id);
}
