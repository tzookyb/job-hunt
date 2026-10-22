import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneDigits, contactLinks, upgradeContacts } from '../../public/js/model/contacts.js';
import { normalize } from '../../public/js/model/normalize.js';

test('phone digits: international, 00-prefixed and local numbers', () => {
  assert.equal(phoneDigits('+972 54-123-4567'), '972541234567');
  assert.equal(phoneDigits('00972541234567'), '972541234567');
  assert.equal(phoneDigits('054-1234567'), '972541234567');
  assert.equal(phoneDigits('123'), '');
});

test('links: WhatsApp from its own link, else built from the phone', () => {
  assert.equal(contactLinks({ phone: '054-1234567', whatsapp: '', linkedin: '' }).whatsapp, 'https://wa.me/972541234567');
  assert.equal(contactLinks({ phone: '', whatsapp: 'wa.me/123456789', linkedin: '' }).whatsapp, 'https://wa.me/123456789');
  assert.deepEqual(contactLinks({ phone: '', whatsapp: '', linkedin: '' }), { phone: '', whatsapp: '', linkedin: '' });
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
