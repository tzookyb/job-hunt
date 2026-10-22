// A company's stages: done ✓, comment and "relevant" switch. Used on the company page.
import { esc } from '../util.js';
import { mainEl, delegate } from '../dom.js';
import { save } from '../store.js';
import { emit } from '../bus.js';
import { companyOf, stageName, stageOrder } from './common.js';

export function stageListHtml(c) {
  let n = 0;
  return `<div class="stagelist">
    <table class="stbl">
      <thead><tr><th>#</th><th>Done</th><th>Stage</th><th>Comment</th><th>Relevant</th></tr></thead>
      <tbody>${stageOrder().map(id => { const x = c.stages[id]; return `
        <tr class="srow ${x.enabled ? '' : 'off'} ${x.done ? 'done' : ''}" data-stage="${id}">
          <td class="num">${x.enabled ? ++n : '–'}</td>
          <td><input type="checkbox" data-sd="${id}" ${x.done ? 'checked' : ''} ${x.enabled ? '' : 'disabled'}></td>
          <td class="sname">${esc(stageName(id))}</td>
          <td><input class="scomment" data-sc="${id}" value="${esc(x.comment)}" placeholder="comment…"></td>
          <td class="rel"><label class="switch" title="Does this company have this stage?"><input type="checkbox" data-se="${id}" ${x.enabled ? 'checked' : ''}><span></span></label></td>
        </tr>`; }).join('')}</tbody>
    </table>
  </div>`;
}

export function init() {
  const main = mainEl();
  delegate(main, 'change', 'input[data-sd]', (e, el) => {
    const c = companyOf(el);
    c.stages[el.dataset.sd].done = el.checked;
    save(); emit('company:changed', c);
  });
  delegate(main, 'change', 'input[data-se]', (e, el) => {
    const c = companyOf(el);
    c.stages[el.dataset.se].enabled = el.checked;
    save(); emit('company:changed', c);
  });
  delegate(main, 'input', 'input[data-sc]', (e, el) => {
    companyOf(el).stages[el.dataset.sc].comment = el.value;
    save();
  });
}
