// Click the big logo on the company page to paste an image URL: Enter saves, Esc restores, empty removes it.
import { mainEl, delegate, $ } from '../dom.js';
import { esc } from '../util.js';
import { companyOf, logoHtml } from './common.js';

export const logoEditorHtml = c => `<span class="logo-wrap">
    <button class="logo-btn" title="Click to paste a logo image URL">${logoHtml(c, 'big')}</button>
    <input class="field logo-input" data-f="logo" value="${esc(c.logo)}" placeholder="Paste logo image URL — Enter to save, Esc to cancel">
  </span>`;

export function init() {
  const main = mainEl();
  delegate(main, 'click', '.logo-btn', (e, el) => {
    const wrap = el.closest('.logo-wrap'), input = $('.logo-input', wrap);
    if (wrap.classList.toggle('editing')) { input.dataset.orig = companyOf(el).logo; input.focus(); input.select(); }
  });
  delegate(main, 'keydown', '.logo-input', (e, el) => {
    if (e.key !== 'Enter' && e.key !== 'Escape') return;
    if (e.key === 'Escape' && el.value !== el.dataset.orig) {
      el.value = el.dataset.orig || '';
      el.dispatchEvent(new Event('input', { bubbles: true }));   // goes through the normal field binding
    }
    e.stopPropagation();   // Esc here must not leave the page
    el.blur();
  });
  delegate(main, 'focusout', '.logo-input', (e, el) => el.closest('.logo-wrap').classList.remove('editing'));
}
