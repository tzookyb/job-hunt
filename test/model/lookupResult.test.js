import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';
import { newCompany } from '../../public/js/model/company.js';
import { applyLookup, acceptSuggestions, jobNeedsAnalysis, jobBasis, textHash, reliableLink } from '../../public/js/model/lookupResult.js';

const state = () => normalize({ stageDefaultsV2: true, stages: [{ id: 's0', name: 'Application' }], companies: [] }).data;
const company = fields => newCompany(state(), { name: 'Acme', ...fields });

const result = (over = {}) => ({
  website: 'https://acme.example', logo: 'https://acme.example/logo.png',
  links: { linkedinUrl: 'https://www.linkedin.com/company/acme/', crunchbaseUrl: 'https://www.crunchbase.com/organization/acme', levelsUrl: 'https://www.levels.fyi/companies/acme' },
  log: { linkedinUrl: 'company website', crunchbaseUrl: 'naive address (not checked)', levelsUrl: 'ai (checked)' },
  ...over,
});
const aiNotes = (job = { title: 'Expert Frontend Engineer', prep: ['System design'] }) => ({ summary: 'Acme makes things.', fit: { matches: [], gaps: [], flags: [] }, job, sources: [], model: 'groq/x', at: '2026-10-28T10:00:00Z' });

test('empty fields are filled; nothing to suggest', () => {
  const c = company();
  const r = applyLookup(c, result());
  assert.deepEqual(r.filled, ['website', 'logo', 'LinkedIn', 'Crunchbase', 'Levels.fyi']);
  assert.deepEqual(r.suggestions, []);
  assert.equal(c.crunchbaseUrl, 'https://www.crunchbase.com/organization/acme');   // a guess may fill an empty field
});

test('filled fields are never changed; reliable different values become suggestions', () => {
  const c = company({
    website: 'https://old-acme.example', logo: 'mine.png',
    linkedinUrl: 'https://www.linkedin.com/company/acme-old/',   // reliable new value → suggestion
    crunchbaseUrl: 'https://www.crunchbase.com/organization/mine', // new value is only a guess → no suggestion
    levelsUrl: 'http://levels.fyi/companies/acme/',               // same page, other spelling → no suggestion
    comments: 'my own notes',
  });
  const r = applyLookup(c, result());
  assert.deepEqual(r.filled, []);
  assert.deepEqual(r.suggestions.map(s => [s.field, s.from, s.to]), [
    ['website', 'https://old-acme.example', 'https://acme.example'],
    ['linkedinUrl', 'https://www.linkedin.com/company/acme-old/', 'https://www.linkedin.com/company/acme/'],
  ]);
  assert.equal(c.website, 'https://old-acme.example');
  assert.equal(c.logo, 'mine.png');
  assert.equal(c.comments, 'my own notes');
});

test('the job title fills an empty position, or is suggested for a different one', () => {
  const empty = company();
  applyLookup(empty, result({ ai: aiNotes() }));
  assert.equal(empty.position, 'Expert Frontend Engineer');

  const typed = company({ position: 'Senior Frontend Engineer' });
  const r = applyLookup(typed, result({ ai: aiNotes() }));
  assert.deepEqual(r.suggestions.find(s => s.field === 'position'), { field: 'position', label: 'position', from: 'Senior Frontend Engineer', to: 'Expert Frontend Engineer' });
  assert.equal(typed.position, 'Senior Frontend Engineer');
  acceptSuggestions(typed, r.suggestions.filter(s => s.field === 'position'));
  assert.equal(typed.position, 'Expert Frontend Engineer');

  const same = company({ position: 'expert frontend engineer ' });
  assert.equal(applyLookup(same, result({ ai: aiNotes() })).suggestions.some(s => s.field === 'position'), false);
  const noJob = company({ position: 'Senior' });
  assert.equal(applyLookup(noJob, result({ ai: aiNotes(null) })).suggestions.some(s => s.field === 'position'), false);
});

test('AI notes replace the old ones and remember which job post they analyzed; a failed AI keeps them', () => {
  const c = company({ careersUrl: 'https://jobs.example/1', comments: 'keep me' });
  applyLookup(c, result({ ai: aiNotes() }));
  assert.equal(c.ai.summary, 'Acme makes things.');
  assert.deepEqual(c.ai.basis, { careersUrl: 'https://jobs.example/1', jobHash: '' });
  const r = applyLookup(c, result({ ai: null, aiError: 'Rate limited' }));
  assert.equal(r.aiError, 'Rate limited');
  assert.equal(c.ai.summary, 'Acme makes things.');
  assert.equal(c.comments, 'keep me');
});

test('"Analyze this job post" shows only when there is a job post the notes haven\'t analyzed', () => {
  const c = company();
  assert.equal(jobNeedsAnalysis(c), false);              // no job post
  c.careersUrl = 'https://jobs.example/1';
  assert.equal(jobNeedsAnalysis(c), true);               // no notes yet
  applyLookup(c, result({ ai: aiNotes() }), { basis: jobBasis(c) });
  assert.equal(jobNeedsAnalysis(c), false);
  c.jobText = 'Senior Frontend Engineer. We build…';
  assert.equal(jobNeedsAnalysis(c), true);               // pasted text added
  applyLookup(c, result({ ai: aiNotes() }), { basis: jobBasis(c) });
  assert.equal(jobNeedsAnalysis(c), false);
  c.jobText += ' More.';
  assert.equal(jobNeedsAnalysis(c), true);               // pasted text edited
});

test('the basis is the job post as sent, even if the user edits it during the lookup', () => {
  const c = company({ careersUrl: 'https://jobs.example/1' });
  const basis = jobBasis(c);
  c.careersUrl = 'https://jobs.example/2';
  applyLookup(c, result({ ai: aiNotes() }), { basis });
  assert.equal(jobNeedsAnalysis(c), true);
});

test('old data loads with no AI notes and no pasted job post', () => {
  const d = normalize({ stageDefaultsV2: true, stages: [{ id: 's0', name: 'Application' }], companies: [{ id: 'a', name: 'A' }, { id: 'b', ai: 'junk', jobText: 5 }] }).data;
  for (const c of d.companies) { assert.equal(c.ai, null); assert.equal(c.jobText, ''); }
});

test('helpers', () => {
  assert.equal(textHash('abc'), textHash('  abc '));
  assert.notEqual(textHash('abc'), textHash('abd'));
  assert.equal(reliableLink('wikidata'), true);
  assert.equal(reliableLink('ai (checked)'), true);
  assert.equal(reliableLink('naive address (not checked)'), false);
  assert.equal(reliableLink('ai (not checked)'), false);
  assert.equal(reliableLink(undefined), false);
});
