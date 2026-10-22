// Points of contact on the company page: name · phone (📞 call) · WhatsApp · LinkedIn, ＋ to add, ✕ to remove.
import { esc } from '../util.js';
import { mainEl, delegate, $, $$ } from '../dom.js';
import { save } from '../store.js';
import { emit } from '../bus.js';
import { blankContact, contactLinks, hasData } from '../model/contacts.js';
import { companyOf } from './common.js';

const ICON = {
  phone: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.6-.3z"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.06c.53-1 1.83-2.06 3.77-2.06C21.2 9.04 22 11.6 22 15v6h-4v-5.3c0-1.27-.02-2.9-1.77-2.9-1.77 0-2.04 1.38-2.04 2.8V21h-4z"/></svg>',
};
const TITLES = { phone: 'Call', whatsapp: 'Open WhatsApp', linkedin: 'Open LinkedIn' };

// A button is greyed out when its field is empty; clicking it then focuses that field.
const iconLink = (links, kind) => `<a class="ci ${links[kind] ? '' : 'off'}" data-ci="${kind}" href="${esc(links[kind] || '#')}" ${kind === 'phone' ? '' : 'target="_blank" rel="noopener"'} title="${TITLES[kind]}">${ICON[kind]}</a>`;

const input = (x, f, placeholder, type = 'text') => `<input data-ct="${x.id}" data-cf="${f}" type="${type}" value="${esc(x[f])}" placeholder="${placeholder}">`;

function contactHtml(x) {
  const L = contactLinks(x);
  return `<div class="contact" data-ctid="${x.id}">
    <div class="lc">${input(x, 'name', 'Name')}</div>
    <div class="lc">${input(x, 'phone', 'Phone', 'tel')}${iconLink(L, 'phone')}</div>
    <div class="lc">${input(x, 'whatsapp', 'WhatsApp chat link')}${iconLink(L, 'whatsapp')}</div>
    <div class="lc">${input(x, 'linkedin', 'LinkedIn chat')}${iconLink(L, 'linkedin')}</div>
    <button class="icon del-contact" title="Remove contact">✕</button>
  </div>`;
}

export const contactsHtml = c => `<div class="full contacts">
    <div class="chead">Point of contact <button class="icon add-contact" title="Add another contact">＋</button></div>
    ${c.contacts.map(contactHtml).join('')}
  </div>`;

const contactOf = (c, el) => c.contacts.find(x => x.id === el.closest('.contact').dataset.ctid);

export function init() {
  const main = mainEl();
  delegate(main, 'input', '[data-ct]', (e, el) => {
    const x = contactOf(companyOf(el), el);
    x[el.dataset.cf] = el.value;
    const L = contactLinks(x);
    $$('.ci', el.closest('.contact')).forEach(a => { const u = L[a.dataset.ci]; a.href = u || '#'; a.classList.toggle('off', !u); });
    save();
  });
  delegate(main, 'click', '.ci.off', (e, el) => { e.preventDefault(); $('input', el.closest('.lc')).focus(); });
  delegate(main, 'click', '.add-contact', (e, el) => {
    const c = companyOf(el), x = blankContact();
    c.contacts.push(x); save(); emit('render');
    $(`[data-ctid="${x.id}"] input`, main).focus();
  });
  delegate(main, 'click', '.del-contact', (e, el) => {
    const c = companyOf(el), x = contactOf(c, el);
    if (hasData(x) && !confirm(`Remove contact ${x.name || ''}?`)) return;
    c.contacts = c.contacts.filter(y => y !== x);
    if (!c.contacts.length) c.contacts.push(blankContact());
    save(); emit('render');
  });
}
