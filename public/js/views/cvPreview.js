// Quick Look–style preview of a CV: a large overlay over the page. Opens from any [data-cvopen="<cv id>"]
// (click, or Space on a focused chip); Space, Esc or a click outside closes it and puts focus back.
import { esc } from '../util.js';
import { getState } from '../store.js';
import { cvById, cvUsage, formatSize, PREVIEWABLE } from '../model/cvs.js';

let box = null, opener = null, openId = null;

const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
const dateLabel = d => d ? new Date(d + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';

function bodyHtml(cv) {
  const src = '/cv/' + encodeURIComponent(cv.file);
  if (/\.pdf$/i.test(cv.file)) return `<iframe class="ql-frame" src="${src}#view=FitH" title="${esc(cv.name)}"></iframe>`;
  if (/\.(png|jpe?g)$/i.test(cv.file)) return `<div class="ql-img"><img src="${src}" alt="${esc(cv.name)}"></div>`;
  if (PREVIEWABLE.test(cv.file)) return `<iframe class="ql-frame light" src="${src}" title="${esc(cv.name)}"></iframe>`;
  const ext = (cv.file.split('.').pop() || '').toUpperCase();
  return `<div class="ql-none"><div class="ql-doc">${esc(ext)}</div><p>Browsers can’t show ${esc(ext)} files.</p>
    <a class="btn primary" href="${src}" download="${esc(cv.name)}">Download to open it</a>
    <p class="hint">Tip: upload a PDF export next time and you’ll be able to preview it here.</p></div>`;
}

export function openCvPreview(id, from = null) {
  const state = getState(), cv = cvById(state, id);
  if (!cv) return;
  closeCvPreview(false);
  opener = from; openId = id;
  const sent = cvUsage(state, id).map(c => c.name || 'Untitled');
  const src = '/cv/' + encodeURIComponent(cv.file);
  box = document.createElement('div');
  box.className = 'ql';
  box.tabIndex = -1;
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', 'Preview of ' + cv.name);
  box.innerHTML = `<div class="ql-box">
    <div class="ql-bar">
      <div class="ql-title"><b title="${esc(cv.name)}">${esc(cv.name)}</b>
        <span>${esc([dateLabel(cv.addedAt) && 'Added ' + dateLabel(cv.addedAt), formatSize(cv.size), sent.length ? 'Sent to ' + sent.join(', ') : 'Not attached to any company'].filter(Boolean).join(' · '))}</span></div>
      <a class="btn ghost" href="${src}" target="_blank" rel="noopener" title="Open in a new tab">Open ↗</a>
      <a class="btn ghost" href="${src}" download="${esc(cv.name)}">Download</a>
      <button class="icon ql-close" title="Close (Space or Esc)">✕</button>
    </div>
    <div class="ql-body">${bodyHtml(cv)}</div>
  </div>`;
  document.body.appendChild(box);
  document.body.classList.add('ql-open');
  box.focus();
}

export function closeCvPreview(restoreFocus = true) {
  if (!box) return;
  box.remove(); box = null;
  document.body.classList.remove('ql-open');
  if (restoreFocus) {
    // the chip may have been redrawn while the preview was open: fall back to any chip for the same CV
    const target = opener?.isConnected ? opener : document.querySelector(`#main [data-cvopen="${openId}"]`);
    target?.focus({ preventScroll: true });
  }
  opener = null; openId = null;
}

export const isCvPreviewOpen = () => !!box;

export function init() {
  document.addEventListener('click', e => {
    const el = e.target.closest?.('[data-cvopen]');
    if (el) { e.preventDefault(); e.stopPropagation(); openCvPreview(el.dataset.cvopen, el); return; }
    if (box && (e.target === box || e.target.closest('.ql-close'))) closeCvPreview();
  });
  // window + capture: runs before the other Esc handlers (popover, company page), so Esc only closes the preview
  window.addEventListener('keydown', e => {
    if (!box) return;
    const space = e.key === ' ' && !typing();
    if (e.key === 'Escape' || space) { e.preventDefault(); e.stopImmediatePropagation(); closeCvPreview(); }
  }, true);
}
