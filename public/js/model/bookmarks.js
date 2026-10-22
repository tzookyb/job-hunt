// Saved links (job boards, salary calculators, your CV…). Pure functions over state.bookmarks.
import { uid, href } from '../util.js';

export function addBookmark(state, url, title = '') {
  url = String(url || '').trim();
  if (!url) return null;
  const b = { id: uid(), title: String(title).trim(), url };
  state.bookmarks.unshift(b);
  return b;
}

export const removeBookmark = (state, id) => { state.bookmarks = state.bookmarks.filter(b => b.id !== id); };

export function moveBookmark(state, fromId, toId) {
  const list = state.bookmarks;
  const from = list.findIndex(b => b.id === fromId), to = list.findIndex(b => b.id === toId);
  if (from < 0 || to < 0 || from === to) return false;
  list.splice(to, 0, ...list.splice(from, 1));
  return true;
}

export const hostOf = url => { try { return new URL(href(url)).hostname.replace(/^www\./, ''); } catch { return url; } };
