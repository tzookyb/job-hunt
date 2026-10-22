// Points of contact and the links built from them. Pure.
import { uid, href } from '../util.js';

export const blankContact = () => ({ id: uid(), name: '', role: '', phone: '', whatsapp: '', linkedin: '' });

export const hasData = x => !!(x.name || x.role || x.phone || x.whatsapp || x.linkedin);

// Phone → digits for tel: and wa.me. "00…" counts as "+…"; a local Israeli number (05x…) becomes +9725x….
export function phoneDigits(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '972' + d.slice(1);
  return d.length >= 8 ? d : '';
}

// The links behind a contact's 📞 / WhatsApp / LinkedIn buttons ('' = not available).
export function contactLinks(x) {
  const raw = String(x.phone || '').replace(/\D/g, '');
  const d = phoneDigits(x.phone);
  return {
    phone: raw ? 'tel:' + raw : '',
    whatsapp: x.whatsapp ? href(x.whatsapp) : d ? 'https://wa.me/' + d : '',
    linkedin: x.linkedin ? href(x.linkedin) : '',
  };
}

// Upgrade (v3): the old single "contact" text + "recruiterUrl" become the first contact. Returns true if changed.
export function upgradeContacts(c) {
  if (Array.isArray(c.contacts)) return false;
  c.contacts = (c.contact || c.recruiterUrl) ? [{ ...blankContact(), name: c.contact || '', linkedin: c.recruiterUrl || '' }] : [];
  delete c.contact;
  delete c.recruiterUrl;
  return true;
}
