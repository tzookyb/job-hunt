// Deleting a company asks first: move it to Rejected or Withdrew (it stays, with its history, in the
// "Rejected, withdrew & gone cold" table), or delete it for good. Used by the sheet's bin and the company page's
// "Delete company". The option matching the company's current status is hidden.
import { $ } from '../dom.js';
import { getState, save } from '../store.js';
import { emit } from '../bus.js';
import { today } from '../util.js';
import { removeCompany } from '../model/company.js';
import { setStatus } from '../model/autoStatus.js';

const MOVE_TO = ['rejected', 'withdrawn'];   // Gone cold is only ever set automatically
const dlg = () => $('#delDlg');
let pending = null;   // { c, resolve } while the dialog is open

// Applies the choice and resolves to 'deleted', 'moved' or null (cancelled).
export function askDelete(c) {
  if (!c) return Promise.resolve(null);
  $('#delTitle').textContent = `Delete ${c.name || 'this company'}?`;
  for (const s of MOVE_TO) $(`[data-act="${s}"]`, dlg()).hidden = c.status === s;
  dlg().returnValue = '';
  dlg().showModal();
  $('.del-acts .btn:not([hidden])', dlg()).focus();
  return new Promise(resolve => { pending = { c, resolve }; });
}

function apply(c, act) {
  if (act === 'delete') { removeCompany(getState(), c.id); save(); return 'deleted'; }
  if (MOVE_TO.includes(act)) {
    setStatus(c, act, today()); save();
    emit('render');   // moves the row to the closed table / redraws the company page
    return 'moved';
  }
  return null;
}

export function init() {
  dlg().addEventListener('click', e => {
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act) dlg().close(act);
  });
  dlg().addEventListener('close', () => {
    if (!pending) return;
    const { c, resolve } = pending;
    pending = null;
    resolve(apply(c, dlg().returnValue));
  });
}
