// DOM helpers. Features attach their own delegated listeners instead of growing one big handler.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const mainEl = () => document.getElementById('main');

// Calls handler(event, matchedElement) for events inside `root` whose target matches `selector`.
export function delegate(root, type, selector, handler, options) {
  root.addEventListener(type, e => {
    const el = e.target.closest?.(selector);
    if (el && root.contains(el)) handler(e, el);
  }, options);
}

export function autosize(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}
