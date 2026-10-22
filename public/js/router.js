// Picks the view from the URL hash: "#/c/<id>" → company page, anything else → the sheet.
import { on } from './bus.js';
import { renderSheet } from './views/sheet.js';
import { renderDetail } from './views/detail.js';

const detailId = () => (location.hash.match(/^#\/c\/(.+)$/) || [])[1];

export function route() {
  const id = detailId();
  document.body.classList.toggle('in-detail', !!id);
  if (id) renderDetail(id);
  else { renderSheet(); window.scrollTo(0, 0); }
}

export function init() {
  window.addEventListener('hashchange', route);
  on('render', route);
}
