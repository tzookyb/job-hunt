import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize } from '../../public/js/model/normalize.js';
import { applicationStageId, addCv, companyCv, cvUsage, cvsNewestFirst, forgetCv, formatSize, PREVIEWABLE } from '../../public/js/model/cvs.js';

const state = names => normalize({ stageDefaultsV2: true, stages: names.map((name, i) => ({ id: 's' + i, name })), companies: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }).data;

test('the CV goes with the locked Application stage', () => {
  assert.equal(applicationStageId(state(['HR', 'Application', 'Tech'])), 's1');
  assert.equal(applicationStageId(state(['HR', ' applied '])), 's1');
  const d = state(['Phone', 'Tech']);   // no Application stage yet → one is added, first
  assert.equal(applicationStageId(d), d.stages[0].id);
  assert.equal(d.stages[0].name, 'Application');
});

test('old data loads with an empty library and no CV per company', () => {
  const d = state(['Applied']);
  assert.deepEqual(d.cvs, []);
  assert.equal(d.companies[0].cv, '');
  // a company pointing at a missing library entry is cleared
  const d2 = normalize({ ...d, cvs: [{ id: 'x', file: 'f.pdf', name: 'cv.pdf' }], companies: [{ id: 'a', cv: 'gone' }, { id: 'b', cv: 'x' }] }).data;
  assert.equal(d2.companies[0].cv, '');
  assert.equal(d2.companies[1].cv, 'x');
});

test('the same stored file is listed once; companies share it', () => {
  const d = state(['Applied']);
  const [a, b] = d.companies;
  const v1 = addCv(d, { file: '1111.pdf', size: 2048, name: 'CV.pdf' }, '2026-10-20');
  assert.equal(addCv(d, { file: '1111.pdf', size: 2048, name: 'CV copy.pdf' }, '2026-10-26'), v1);
  const v2 = addCv(d, { file: '2222.pdf', size: 3000, name: 'CV.pdf' }, '2026-10-26');
  assert.equal(d.cvs.length, 2);
  a.cv = v1.id; b.cv = v1.id;
  assert.equal(companyCv(d, a), v1);
  assert.deepEqual(cvUsage(d, v1.id).map(c => c.id), ['a', 'b']);
  assert.deepEqual(cvsNewestFirst(d).map(x => x.id), [v2.id, v1.id]);
  assert.equal(forgetCv(d, v1.id), false, 'in use');
  assert.equal(forgetCv(d, v2.id), true);
  assert.deepEqual(d.cvs, [v1]);
});

test('helpers: sizes and which files the browser can preview', () => {
  assert.equal(formatSize(900), '900 B');
  assert.equal(formatSize(150 * 1024), '150 KB');
  assert.equal(formatSize(2.5 * 1024 * 1024), '2.5 MB');
  assert.ok(PREVIEWABLE.test('a.PDF'));
  assert.ok(!PREVIEWABLE.test('a.docx'));
});
