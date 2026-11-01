// "AI notes" on the company page: what the AI lookup wrote about the company and the job post. Read-only on
// purpose (owner's decision): plain text, never inputs, replaced as a whole by ↻ Re-analyze. Everything the
// model wrote is escaped; the only links are the pages the server itself read.
import { esc, href } from '../util.js';
import { jobNeedsAnalysis, hasJobInput } from '../model/lookupResult.js';

const errors = new Map();   // company id → the last AI error (not saved: it's about that moment)
export const noteAiError = (id, message) => { if (message) errors.set(id, message); else errors.delete(id); };

const list = (title, items, cls = '') => items?.length
  ? `<div class="ai-list ${cls}"><h4>${esc(title)}</h4><ul>${items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : '';

const when = iso => {
  const d = new Date(iso);
  return isNaN(d) ? '' : d.toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
};

function jobHtml(c) {
  const j = c.ai?.job;
  if (!j) {
    if (!hasJobInput(c)) return '<p class="ai-empty">Add the job post link (or paste its text) to get a role analysis.</p>';
    if (jobNeedsAnalysis(c)) return '<p class="ai-empty">Press “Analyze this job post” for a role analysis.</p>';
    return '<p class="ai-empty">The job post at that link couldn’t be read (LinkedIn needs a login, some pages load by script). Paste its text in “Paste job post”, then press “Analyze this job post”.</p>';
  }
  const facts = [j.title, j.seniority, j.location, j.workMode].filter(Boolean).map(esc).join(' · ');
  return `
    ${facts ? `<div class="ai-facts">${facts}</div>` : ''}
    ${j.stack?.length ? `<div class="ai-chips">${j.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
    <div class="ai-cols">
      ${list('Must have', j.mustHave)}
      ${list('Nice to have', j.niceToHave)}
      ${list('You match', j.matches, 'good')}
      ${list('Gaps', j.gaps, 'warn')}
      ${list('Prepare for the interviews', j.prep)}
      ${list('Ask about / red flags', j.flags, 'warn')}
    </div>
    ${j.snapshot ? `<details class="ai-snap"><summary>Job post as analyzed${j.source === 'pasted' ? ' (pasted)' : ''}</summary><div>${esc(j.snapshot)}</div></details>` : ''}`;
}

export function aiNotesHtml(c) {
  const a = c.ai, err = errors.get(c.id);
  const needsJob = jobNeedsAnalysis(c) && !!a;
  const buttons = `
    ${needsJob ? '<button class="btn primary ai-run" data-why="job">Analyze this job post</button>' : ''}
    <button class="btn ai-run" data-why="refresh" title="Run the AI lookup again (one request to your AI provider). Your own fields and comments are never changed without asking.">${a ? '↻ Re-analyze' : '✦ Analyze with AI'}</button>`;
  const head = `<div class="ai-head"><h2>AI notes</h2><div class="ai-acts">${buttons}</div></div>`;
  const error = err ? `<div class="ai-error">⚠ ${esc(err)}${a ? ' — these are the previous notes.' : ''}</div>` : '';
  if (!a) {
    return `<section class="ai-notes">${head}${error}
      <p class="ai-empty">No AI notes yet. With a free AI provider set up in ⚙, the lookup describes the company, judges how it fits you and analyzes the job post.</p></section>`;
  }
  const fit = a.fit || {};
  return `<section class="ai-notes">${head}${error}
    <div class="ai-meta">By ${esc(a.model)} · ${esc(when(a.at))} · read-only, replaced on re-analyze</div>
    <div class="ai-card">
      ${a.summary ? `<p class="ai-summary">${esc(a.summary)}</p>` : ''}
      ${a.whatTheyDo ? `<p><b>What they do:</b> ${esc(a.whatTheyDo)}</p>` : ''}
      ${a.stage ? `<p><b>Stage:</b> ${esc(a.stage)}</p>` : ''}
      <div class="ai-cols">${list('Fits you', fit.matches, 'good')}${list('Gaps', fit.gaps, 'warn')}${list('Watch out', fit.flags, 'warn')}</div>
    </div>
    <h3>Job post</h3>
    <div class="ai-card">${jobHtml(c)}</div>
    ${a.sources?.length ? `<div class="ai-sources">Read: ${a.sources.map(u => `<a href="${esc(href(u))}" target="_blank" rel="noopener noreferrer">${esc(u.replace(/^https?:\/\/(www\.)?/, ''))}</a>`).join(' · ')}</div>` : ''}
  </section>`;
}

export function init() {}
