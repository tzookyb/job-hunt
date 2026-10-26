// Pending action: one thing to do next for a company (text + optional link, e.g. a scheduling page).
// Sheet: a bold "⚑ Action" badge next to the name; hovering it shows the action, its link and "✓ Done".
// Company page: a box under the progress bar to write it, plus the log of finished actions.
import { esc, href, today } from '../util.js';
import { mainEl, delegate, $ } from '../dom.js';
import { save } from '../store.js';
import { emit } from '../bus.js';
import { companyOf } from './common.js';
import { hasAction, setAction, completeAction, removeLogEntry } from '../model/action.js';

const day = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
const host = u => { try { return new URL(href(u)).hostname.replace(/^www\./, ''); } catch { return u; } };
const linkHtml = (u, cls = '') => u ? `<a class="${cls}" href="${esc(href(u))}" target="_blank" rel="noopener" title="${esc(u)}">${esc(host(u))} ↗</a>` : '';

// ---- sheet badge + hover card ----

export const actionBadgeHtml = c => hasAction(c)
  ? `<button class="act-btn" aria-label="Pending action: ${esc(c.action.text)}">⚑ Action</button>` : '';

const OPEN_DELAY = 80, HIDE_DELAY = 250;
let tip = null, tipFor = null, openT = null, hideT = null;

function closeTip() {
  clearTimeout(openT); clearTimeout(hideT);
  tip?.remove(); tip = null; tipFor = null;
}

function openTip(c, anchor) {
  closeTip();
  tip = document.createElement('div');
  tip.className = 'act-tip';
  tip.dataset.id = c.id;
  tip.innerHTML = `<div class="act-tip-h">Pending action${c.action.since ? `<span>since ${esc(day(c.action.since))}</span>` : ''}</div>
    <div class="act-tip-t">${esc(c.action.text)}</div>
    ${linkHtml(c.action.url, 'act-tip-link')}
    <div class="act-tip-f"><button class="btn act-edit">Edit</button><button class="btn act-done">✓ Done</button></div>`;
  mainEl().appendChild(tip);
  tipFor = c.id;
  const r = anchor.getBoundingClientRect(), h = tip.offsetHeight, w = tip.offsetWidth;
  const below = r.bottom + 6 + h <= window.innerHeight || r.top < h + 8;
  tip.style.top = (below ? r.bottom + 6 : r.top - h - 6) + 'px';
  tip.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
}

const hideSoon = () => { clearTimeout(openT); clearTimeout(hideT); hideT = setTimeout(closeTip, HIDE_DELAY); };

// ---- company page box ----

export function actionBoxHtml(c) {
  const a = c.action, log = c.actionLog;
  return `<section class="actbox ${hasAction(c) ? 'on' : ''}">
    <div class="acthead"><h2>⚑ Pending action</h2><span class="hint act-since">${a.since ? 'since ' + esc(day(a.since)) : ''}</span></div>
    <div class="actrow">
      <input class="field" data-a="text" value="${esc(a.text)}" placeholder="What do you need to do next? e.g. Book a slot for the tech interview">
      <div class="lc"><input data-a="url" value="${esc(a.url)}" placeholder="Link (optional), e.g. the scheduling page"><a class="go ${a.url ? '' : 'hidden'}" href="${esc(href(a.url))}" target="_blank" rel="noopener" title="Open">↗</a></div>
      <button class="btn act-done" ${hasAction(c) ? '' : 'disabled'} title="Mark it done: it moves to the log below">✓ Done</button>
    </div>
    ${log.length ? `<details class="actlog"><summary>Done actions (${log.length})</summary><ul>
      ${log.map(x => `<li data-l="${x.id}"><span class="d" title="Set ${esc(day(x.since))}">${esc(day(x.done))}</span><span class="t">${esc(x.text)}</span>${linkHtml(x.url)}<button class="icon del-log" title="Remove from log">✕</button></li>`).join('')}
    </ul></details>` : ''}
  </section>`;
}

export function init() {
  const main = mainEl();

  // hover card in the sheet
  delegate(main, 'mouseover', '.act-btn', (e, el) => {
    const c = companyOf(el);
    clearTimeout(hideT);
    if (tipFor === c.id) return;
    clearTimeout(openT);
    openT = setTimeout(() => openTip(c, el), OPEN_DELAY);
  });
  delegate(main, 'click', '.act-btn', (e, el) => { e.stopPropagation(); openTip(companyOf(el), el); });
  delegate(main, 'mouseout', '.act-btn', hideSoon);
  delegate(main, 'mouseover', '.act-tip', () => clearTimeout(hideT));
  delegate(main, 'mouseout', '.act-tip', (e, el) => { if (!el.contains(e.relatedTarget)) hideSoon(); });
  delegate(main, 'click', '.act-edit', (e, el) => { const id = companyOf(el).id; closeTip(); location.hash = '#/c/' + id; });
  window.addEventListener('scroll', closeTip, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && tip) { e.stopImmediatePropagation(); closeTip(); } }, true);

  // Done (from the hover card or the company page): log it and clear it
  delegate(main, 'click', '.act-done', (e, el) => {
    const c = companyOf(el);
    if (!completeAction(c, today())) return;
    closeTip(); save(); emit('render');
  });

  // editing on the company page
  delegate(main, 'input', '[data-a]', (e, el) => {
    const c = companyOf(el);
    setAction(c, el.dataset.a, el.value, today());
    const box = el.closest('.actbox');
    box.classList.toggle('on', hasAction(c));
    $('.act-done', box).disabled = !hasAction(c);
    $('.act-since', box).textContent = c.action.since ? 'since ' + day(c.action.since) : '';
    const go = el.parentElement.querySelector('.go');
    if (go) { go.href = href(el.value); go.classList.toggle('hidden', !el.value); }
    save();
  });
  delegate(main, 'keydown', '[data-a]', (e, el) => { if (e.key === 'Enter') el.blur(); });
  delegate(main, 'click', '.del-log', (e, el) => {
    const c = companyOf(el);
    if (!confirm('Remove this from the log?')) return;
    removeLogEntry(c, el.closest('li').dataset.l); save(); emit('render');
  });
}
