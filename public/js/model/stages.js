// The shared stage list and each company's own order of it. Pure functions over the app state.
import { uid } from '../util.js';
import { blankStage } from './normalize.js';
import { CLOSED } from '../config.js';

// Adds a stage to the shared list; every company gets it (on for open processes, off for closed ones).
// If a stage with that name exists, it is just switched on for `forCompany`.
export function addStage(state, name, forCompany = null) {
  name = String(name || '').trim();
  if (!name) return null;
  const existing = state.stages.find(s => s.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    if (forCompany) forCompany.stages[existing.id].enabled = true;
    return existing;
  }
  const s = { id: uid(), name };
  state.stages.push(s);
  for (const c of state.companies) {
    c.order.push(s.id);
    c.stages[s.id] = blankStage(!CLOSED.includes(c.status));
  }
  return s;
}

export function deleteStage(state, id) {
  state.stages = state.stages.filter(s => s.id !== id);
  for (const c of state.companies) {
    c.order = c.order.filter(x => x !== id);
    delete c.stages[id];
  }
}

// Swap an item with its neighbour (delta -1 = up, +1 = down). Returns false at the edges.
export function moveBy(list, index, delta) {
  const j = index + delta;
  if (index < 0 || j < 0 || j >= list.length) return false;
  [list[index], list[j]] = [list[j], list[index]];
  return true;
}

// Move `id` before or after `targetId` inside a list of ids.
export function moveTo(ids, id, targetId, after) {
  if (id === targetId) return ids;
  const out = ids.filter(x => x !== id);
  out.splice(out.indexOf(targetId) + (after ? 1 : 0), 0, id);
  return out;
}

export function applyOrderToAll(state) {
  const order = state.stages.map(s => s.id);
  for (const c of state.companies) c.order = [...order];
}
