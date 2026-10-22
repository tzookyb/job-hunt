// Hovering a Progress cell in the sheet opens that company's stage list in a popover. It stays open while
// you type or drag inside it, and closes on Esc, a click outside, scrolling or moving away.
import { esc } from '../util.js';
import { mainEl, $, $$ } from '../dom.js';
import { on } from '../bus.js';
import { companyOf } from './common.js';
import { stageListHtml, isDraggingStage } from './stageList.js';

const OPEN_DELAY = 120, HIDE_DELAY = 250;
let pop = null, popFor = null, openT = null, hideT = null;

export const popoverCompanyId = () => popFor;

function place(anchor) {
  const r = anchor.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
  const below = r.bottom + 4 + h <= window.innerHeight || r.top < h + 8;
  pop.style.top = (below ? r.bottom + 4 : r.top - h - 4) + 'px';
  pop.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
}

export function openPopover(c, anchor) {
  closePopover();
  pop = document.createElement('div');
  pop.className = 'pop';
  pop.dataset.id = c.id;
  pop.innerHTML = `<div class="pop-head"><b>${esc(c.name || 'Untitled')}</b><span>drag ⋮⋮ to reorder · toggle to disable</span></div>${stageListHtml(c)}`;
  mainEl().appendChild(pop);
  popFor = c.id;
  anchor.classList.add('open');
  place(anchor);
}

export function closePopover() {
  clearTimeout(openT); clearTimeout(hideT);
  pop?.remove();
  pop = null; popFor = null;
  $$('.prog.open', mainEl()).forEach(p => p.classList.remove('open'));
}

const anchorOf = id => $(`tr.row[data-id="${id}"] .prog`, mainEl());
const busy = () => pop && (pop.contains(document.activeElement) || isDraggingStage());

export function init() {
  const main = mainEl();
  main.addEventListener('mouseover', e => {
    const p = e.target.closest('.prog');
    if (p) {
      clearTimeout(hideT);
      const c = companyOf(p);
      if (popFor === c.id || busy()) return;
      clearTimeout(openT);
      openT = setTimeout(() => openPopover(c, p), OPEN_DELAY);
    } else if (e.target.closest('.pop')) clearTimeout(hideT);
  });
  main.addEventListener('mouseout', e => {
    const from = e.target.closest('.prog, .pop');
    const to = e.relatedTarget?.closest?.('.prog, .pop');
    if (!from || to) return;
    clearTimeout(openT);
    hideT = setTimeout(() => { if (!busy()) closePopover(); }, HIDE_DELAY);
  });
  document.addEventListener('mousedown', e => { if (pop && !pop.contains(e.target) && !e.target.closest('.prog')) closePopover(); });
  document.addEventListener('scroll', e => { if (pop && !pop.contains(e.target)) closePopover(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && pop) { e.stopImmediatePropagation(); closePopover(); } }, true);
  window.addEventListener('resize', closePopover);

  // keep the popover in sync with the company's row
  on('company:changed', c => {
    if (!pop || popFor !== c.id) return;
    $('.stagelist', pop).outerHTML = stageListHtml(c);
    const a = anchorOf(c.id);
    if (a) { a.classList.add('open'); place(a); }
  });
  on('render', closePopover);
}

// After a stage was added from the popover: reopen it for the same company, focused on "+ Add stage".
export function reopen(c) {
  const a = anchorOf(c.id);
  if (!a) return;
  openPopover(c, a);
  $('.newstage', pop).focus();
}
