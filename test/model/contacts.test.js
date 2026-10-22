import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneDigits, contactLinks, upgradeContacts, upgradeWhatsapp } from '../../public/js/model/contacts.js';
import { normalize } from '../../public/js/model/normalize.js';

test('phone digits: international, 00-prefixed and local numbers', () => {
  assert.equal(phoneDigits('+972 54-123-4567'), '972541234567');
  assert.equal(phoneDigits('00972541234567'), '972541234567');
  assert.equal(phoneDigits('054-1234567'), '972541234567');
  assert.equal(phoneDigits('123'), '');
});

test('call and WhatsApp Web links are computed from the phone', () => {
  for (const phone of ['+972 54-123-4567', '00972541234567', '054-1234567']) {
    assert.deepEqual(contactLinks({ phone, linkedin: '' }), {
      phone: 'tel:+972541234567', whatsapp: 'https://web.whatsapp.com/send?phone=972541234567', linkedin: '',
    });
  }
  assert.equal(contactLinks({ phone: '+1 (415) 555-0100', linkedin: '' }).phone, 'tel:+14155550100');
  assert.deepEqual(contactLinks({ phone: '', linkedin: 'linkedin.com/in/dana' }), { phone: '', whatsapp: '', linkedin: 'https://linkedin.com/in/dana' });
});

test('an old WhatsApp link becomes the phone when there was none', () => {
  const x = { phone: '', whatsapp: 'https://wa.me/972541234567' };
  assert.equal(upgradeWhatsapp(x), true);
  assert.deepEqual(x, { phone: '+972541234567' });
  const keep = { phone: '+1 555', whatsapp: 'https://wa.me/972541234567' };
  upgradeWhatsapp(keep);
  assert.equal(keep.phone, '+1 555');
});

test('old contact + recruiter LinkedIn become the first contact, once', () => {
  const c = { contact: 'Dana', recruiterUrl: 'linkedin.com/in/dana' };
  assert.equal(upgradeContacts(c), true);
  assert.equal(c.contacts[0].name, 'Dana');
  assert.equal(c.contacts[0].linkedin, 'linkedin.com/in/dana');
  assert.ok(!('contact' in c) && !('recruiterUrl' in c));
  assert.equal(upgradeContacts(c), false);
});

test('normalize gives every company at least one (blank) contact and saves the upgrade', () => {
  const { data, migrated } = normalize({ stageDefaultsV2: true, companies: [{ id: 'a' }] });
  assert.equal(data.companies[0].contacts.length, 1);
  assert.equal(migrated, true);
});

test('contacts get a role field, and it is searchable', async () => {
  const { matches } = await import('../../public/js/model/search.js');
  const { data } = normalize({ stageDefaultsV2: true, companies: [{ id: 'a', contacts: [{ id: 'x', name: 'Dana' }] }] });
  const c = data.companies[0];
  assert.equal(c.contacts[0].role, '');
  c.contacts[0].role = 'Recruiter';
  assert.ok(matches(c, 'recruiter'));
});
