// Bookmarks drawer on the main screen: 🔖 at the end of the top bar or the B key. Add, edit, delete and drag to
// reorder. Whether it's open is remembered per browser.
import { esc, href } from '../util.js';
import { $, $$, delegate } from '../dom.js';
import { getState, save } from '../store.js';
import { on } from '../bus.js';
import { addBookmark, removeBookmark, moveBookmark, hostOf } from '../model/bookmarks.js';

const PREF_KEY = 'jobHuntDrawer';
let editing = null, dragId = null;

const drawer = () => $('#drawer');
const isOpen = () => drawer().classList.contains('open');
const remembered = () => { try { return !!localStorage.getItem(PREF_KEY); } catch { return false; } };

function itemHtml(b) {
  if (editing === b.id) return `
    <div class="bm editing" data-bm="${b.id}">
      <input class="field bm-t" value="${esc(b.title)}" placeholder="Title">
      <input class="field bm-u" value="${esc(b.url)}" placeholder="URL">
      <div class="bm-act"><button class="btn ghost bm-cancel">Cancel</button><button class="btn primary bm-save">Save</button></div>
    </div>`;
  const host = hostOf(b.url);
  return `
    <div class="bm" data-bm="${b.id}" draggable="true">
      <img src="https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=32" alt="" referrerpolicy="no-referrer" onerror="this.style.visibility='hidden'">
      <a href="${esc(href(b.url))}" target="_blank" rel="noopener" title="${esc(b.url)}"><b>${esc(b.title || host)}</b><small>${esc(host)}</small></a>
      <button class="icon bm-edit" title="Edit">✎</button><button class="icon bm-del" title="Delete">✕</button>
    </div>`;
}

function render() {
  const list = getState().bookmarks;
  $('#bmList').innerHTML = list.length ? list.map(itemHtml).join('')
    : '<div class="empty small">No bookmarks yet. Paste a link above, like a job board, a salary calculator or your CV.</div>';
}

// byUser: opened/closed by the user (remembered, focuses the URL box); otherwise the page is restoring/hiding it.
export function setDrawer(open, byUser = true) {
  drawer().classList.toggle('open', open);
  document.body.classList.toggle('drawer-open', open);
  if (open) render();
  if (!byUser) return;
  try { localStorage.setItem(PREF_KEY, open ? '1' : ''); } catch { /* not remembered */ }
  if (open) setTimeout(() => $('#bmUrl').focus(), 50);
}

const bookmarkOf = el => getState().bookmarks.find(b => b.id === el.closest('.bm').dataset.bm);

function saveEdit(row, b) {
  const url = $('.bm-u', row).value.trim();
  if (!url) return $('.bm-u', row).focus();
  b.title = $('.bm-t', row).value.trim();
  b.url = url;
  editing = null; save(); render();
}

function initList(list) {
  delegate(list, 'click', '.bm-del', (e, el) => {
    const b = bookmarkOf(el);
    if (!confirm(`Delete bookmark “${b.title || hostOf(b.url)}”?`)) return;
    removeBookmark(getState(), b.id); save(); render();
  });
  delegate(list, 'click', '.bm-edit', (e, el) => {
    editing = bookmarkOf(el).id; render();
    $(`[data-bm="${editing}"] .bm-t`, list).focus();
  });
  delegate(list, 'click', '.bm-cancel', () => { editing = null; render(); });
  delegate(list, 'click', '.bm-save', (e, el) => saveEdit(el.closest('.bm'), bookmarkOf(el)));
  delegate(list, 'keydown', '.bm.editing input', (e, el) => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(el.closest('.bm'), bookmarkOf(el)); }
    if (e.key === 'Escape') { e.stopPropagation(); editing = null; render(); }
  });
  // drag to reorder
  delegate(list, 'dragstart', '.bm', (e, el) => { dragId = el.dataset.bm; el.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; });
  delegate(list, 'dragover', '.bm', (e, el) => {
    if (!dragId) return;
    e.preventDefault();
    $$('.drop', list).forEach(x => x.classList.remove('drop'));
    el.classList.add('drop');
  });
  delegate(list, 'drop', '.bm', (e, el) => {
    if (!dragId) return;
    e.preventDefault();
    if (moveBookmark(getState(), dragId, el.dataset.bm)) save();
    dragId = null; render();
  });
  list.addEventListener('dragend', () => { dragId = null; render(); });
}

export function init() {
  $('#bmBtn').addEventListener('click', () => setDrawer(!isOpen()));
  $('#bmClose').addEventListener('click', () => setDrawer(false));
  $('#bmForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!addBookmark(getState(), $('#bmUrl').value, $('#bmTitle').value)) return $('#bmUrl').focus();
    $('#bmUrl').value = $('#bmTitle').value = '';
    save(); render(); $('#bmUrl').focus();
  });
  initList($('#bmList'));

  const typing = () => /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]')) return;
    if (e.key === 'Escape' && isOpen() && !location.hash) { setDrawer(false); return; }
    if ((e.key === 'b' || e.key === 'B') && !typing() && !e.metaKey && !e.ctrlKey && !location.hash) { e.preventDefault(); setDrawer(!isOpen()); }
  });
  // hidden on company pages, restored on the main screen
  on('route', ({ detail }) => { if (detail) setDrawer(false, false); else if (remembered()) setDrawer(true, false); });
}
