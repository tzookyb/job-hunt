// Points of contact and the links built from them. Pure.
import { uid, href } from '../util.js';

export const blankContact = () => ({ id: uid(), name: '', role: '', phone: '', linkedin: '' });

export const hasData = x => !!(x.name || x.role || x.phone || x.linkedin);

// Phone in international format (+972 54 123 4567) → digits for tel: and WhatsApp Web.
// "00…" counts as "+…"; a local Israeli number (05x…) falls back to +9725x….
export function phoneDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '972' + d.slice(1);
  return d.length >= 8 ? d : '';
}

// The links behind a contact's 📞 / WhatsApp / LinkedIn buttons ('' = not available). WhatsApp is computed from
// the phone — there's no separate field to keep in sync.
export function contactLinks(x) {
  const d = phoneDigits(x.phone);
  return {
    phone: d ? 'tel:+' + d : '',
    whatsapp: d ? 'https://web.whatsapp.com/send?phone=' + d : '',
    linkedin: x.linkedin ? href(x.linkedin) : '',
  };
}

// Upgrade: the separate WhatsApp link field is gone. Keep its number as the phone if there was none.
// Returns true if the contact changed.
export function upgradeWhatsapp(x) {
  if (!('whatsapp' in x)) return false;
  const num = (String(x.whatsapp || '').match(/(?:wa\.me\/|phone=)\+?(\d{8,})/) || [])[1];
  if (num && !x.phone) x.phone = '+' + num;
  if (x.whatsapp && !num) return false;   // a link we can't read: keep it rather than lose it
  delete x.whatsapp;
  return true;
}

// Upgrade (v3): the old single "contact" text + "recruiterUrl" become the first contact. Returns true if changed.
export function upgradeContacts(c) {
  if (Array.isArray(c.contacts)) return false;
  c.contacts = (c.contact || c.recruiterUrl) ? [{ ...blankContact(), name: c.contact || '', linkedin: c.recruiterUrl || '' }] : [];
  delete c.contact;
  delete c.recruiterUrl;
  return true;
}
