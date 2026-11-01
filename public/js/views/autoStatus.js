// Automatic statuses (rules in model/autoStatus.js): a status picked by hand restarts the cold clock, and while
// the tab stays open the cold check runs again every hour (the store runs it once on load).
import { today } from '../util.js';
import { getState, save } from '../store.js';
import { on, emit } from '../bus.js';
import { setStatus, applyCold } from '../model/autoStatus.js';

const HOURLY = 60 * 60 * 1000;

export function init() {
  on('field', ({ c, field }) => {
    if (field !== 'status') return;
    setStatus(c, c.status, today());
    save();
  });
  setInterval(() => {
    if (!getState()) return;
    if (applyCold(getState(), today()).length) { save(); emit('render'); }
  }, HOURLY);
}
