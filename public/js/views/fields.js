// Generic two-way binding: any input with data-f="<field>" inside a company edits that field.
import { mainEl, delegate, autosize } from '../dom.js';
import { href, esc } from '../util.js';
import { save } from '../store.js';
import { emit } from '../bus.js';
import { companyOf } from './common.js';

// An input next to an "open" link (↗) keeps the link in sync.
export const linkInput = (c, f, placeholder) => `<div class="lc"><input data-f="${f}" value="${esc(c[f])}" placeholder="${placeholder}"><a class="go ${c[f] ? '' : 'hidden'}" href="${esc(href(c[f]))}" target="_blank" rel="noopener" title="Open">↗</a></div>`;

export function init() {
  delegate(mainEl(), 'input', '[data-f]', (e, el) => {
    const c = companyOf(el);
    if (!c) return;
    c[el.dataset.f] = el.value;
    const go = el.parentElement.querySelector('.go');
    if (go) { go.href = href(el.value); go.classList.toggle('hidden', !el.value); }
    if (el.tagName === 'TEXTAREA') autosize(el);
    save();
    emit('field', { c, field: el.dataset.f, el });
  });
}
