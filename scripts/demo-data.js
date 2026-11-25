// Sample data for `npm run demo` (and the README screenshots). Everything is relative to the day it is built, so
// the demo always looks used this week: meetings today and tomorrow, a few things from a few days ago, some
// processes gone cold. `npm run demo` rebuilds it on every start (add --keep to keep your demo edits).
//
// Companies are real Israeli employers; the people, phones, CVs, notes, job posts and "AI notes" are made up.
// The AI notes are written by hand in the exact shape the AI lookup stores (see AGENTS.md → AI lookup), so the
// demo shows that feature without needing an API key.
import { textHash } from '../public/js/model/lookupResult.js';
import { storedPdf } from './demo-cv.js';

const day = (offset, time = '') => {
  const d = new Date(Date.now() + offset * 864e5);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10) + (time ? 'T' + time : '');
};
const iso = (offset, hhmm = '10:00') => new Date(day(offset) + 'T' + hhmm + ':00').toISOString();

const STAGES = ['Application', 'HR Initial', 'Tech phone', 'Home assignment', 'Tech interview', 'Manager / final', 'Offer'];
const stages = STAGES.map((name, i) => ({ id: 's' + i, name, defaultOn: i < 2, ...(i ? {} : { locked: true }) }));

// ── the fictional user ("About you", saved to profile.md) ─────────────────────────────────────────────────────
export const DEMO_PROFILE = `Dana Levi (a made-up demo user)
Tel Aviv · 8 years as a frontend / full-stack engineer

Experience
- Senior Frontend Engineer at a B2B SaaS company (2022–now): React, TypeScript, design system used by 6 teams,
  cut the main bundle by 40%, led the move from REST to GraphQL on the client.
- Full-stack developer at a fintech startup (2018–2022): Node.js, PostgreSQL, payments dashboard, on-call.
- Strong: React, TypeScript, performance, accessibility, testing (Playwright, Jest), mentoring.
- Less strong: Kubernetes, Go, mobile (React Native only on a side project).

Looking for
- Senior or staff frontend / full-stack role at a product company, 200+ people.
- Hybrid in Tel Aviv (max 3 office days). Not interested in pure outsourcing or defence.
- Wants real ownership of a product area and a team that cares about quality.
`;

// ── CV library (two small PDFs, so the CV chip and preview work) ──────────────────────────────────────────────
const cvFront = storedPdf(['Dana Levi (demo user)', 'Senior Frontend Engineer', '', 'React, TypeScript, design systems, performance, accessibility.', '8 years. Tel Aviv. This is a made-up CV for the demo.']);
const cvFull = storedPdf(['Dana Levi (demo user)', 'Full-Stack Engineer', '', 'React, TypeScript, Node.js, PostgreSQL, GraphQL.', '8 years. Tel Aviv. This is a made-up CV for the demo.']);
export const DEMO_FILES = [cvFront, cvFull];
const CVS = [
  { id: 'cv1', file: cvFront.file, name: 'Dana_Levi_CV_Frontend.pdf', size: cvFront.bytes.length, type: 'application/pdf', addedAt: day(-24) },
  { id: 'cv2', file: cvFull.file, name: 'Dana_Levi_CV_Fullstack.pdf', size: cvFull.bytes.length, type: 'application/pdf', addedAt: day(-11) },
];

// ── AI notes, in the shape the AI lookup stores ───────────────────────────────────────────────────────────────
const MODEL = 'gemini/gemini-3.5-flash-lite';
function aiNotes(c, n) {
  const job = n.job && {
    title: c.position, seniority: '', location: 'Tel Aviv', workMode: 'Hybrid', stack: [], mustHave: [], niceToHave: [],
    matches: [], gaps: [], prep: [], flags: [], source: 'pasted', snapshot: c.jobText, ...n.job,
  };
  return {
    summary: n.summary, whatTheyDo: n.does, stage: n.stage || '',
    fit: { matches: n.matches || [], gaps: n.gaps || [], flags: n.flags || [] },
    job: job || null,
    sources: [c.website, c.website + '/about', c.website + '/careers'],
    model: MODEL, at: iso(n.ago ?? -5, '09:40'),
    basis: { careersUrl: (c.careersUrl || '').trim(), jobHash: (c.jobText || '').trim() ? textHash(c.jobText) : '' },
  };
}

// ── companies ─────────────────────────────────────────────────────────────────────────────────────────────────
// o.done  = indexes of finished stages     o.on = indexes of stages that apply (Application is always on)
// o.when  = { stageIndex: [dayOffset, 'HH:MM'] }   (Application: the day applied)   o.say = { stageIndex: comment }
// o.r     = research-site slugs (leave one out and the page shows a 🔍 search link instead)
function company(id, name, domain, o) {
  const r = o.r || {};
  const c = {
    id, name, position: o.position, website: 'https://' + domain, careersUrl: o.careersUrl || '', comments: o.comments || '',
    logo: `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
    status: o.status || 'active', closeReason: o.closeReason || '', statusSince: o.since ? day(o.since) : '',
    lastInteraction: o.last == null ? '' : day(o.last), createdAt: Date.now() + (o.added ?? -3) * 864e5,
    glassdoorUrl: '',
    linkedinUrl: r.li ? `https://www.linkedin.com/company/${r.li}/` : '',
    crunchbaseUrl: r.cb ? `https://www.crunchbase.com/organization/${r.cb}` : '',
    levelsUrl: r.lv ? `https://www.levels.fyi/companies/${r.lv}` : '',
    blindUrl: r.bl ? `https://www.teamblind.com/company/${r.bl}` : '',
    comparablyUrl: r.cp ? `https://www.comparably.com/companies/${r.cp}` : '',
    contacts: (o.contacts || [{}]).map((x, i) => ({ id: id + 'p' + i, name: '', role: '', phone: '', linkedin: '', ...x })),
    order: stages.map(s => s.id),
    stages: Object.fromEntries(stages.map((s, i) => [s.id, {
      enabled: i === 0 || (o.on || []).includes(i) || (o.done || []).includes(i),
      done: (o.done || []).includes(i), comment: (o.say || {})[i] || '',
      meeting: o.when?.[i] ? day(...o.when[i]) : '',
    }])),
    notes: (o.notes || []).map(([title, body], i) => ({ id: id + 'n' + i, title, body })),
    action: o.action ? { text: o.action[0], url: o.action[1] || '', since: day(o.action[2] ?? -1) } : { text: '', url: '', since: '' },
    actionLog: (o.log || []).map(([text, since, done], i) => ({ id: id + 'a' + i, text, url: '', since: day(since), done: day(done) })),
    cv: o.cv || '', jobText: o.jobText || '', ai: null,
  };
  if (o.ai) c.ai = aiNotes(c, o.ai);
  return c;
}

const posts = {
  wix: `Senior Frontend Engineer – Editor Platform (Tel Aviv, hybrid)
You will own parts of the visual editor used by millions of site builders. Requirements: 5+ years with React and TypeScript, deep knowledge of browser performance and rendering, experience with large codebases and design systems. Nice to have: canvas / SVG work, accessibility, micro-frontends. You will work closely with product and design, review code and mentor mid-level engineers.`,
  monday: `Full Stack Engineer – Platform Growth (Tel Aviv, hybrid)
Build features across a React frontend and a Node.js backend that serve thousands of teams. Requirements: 4+ years of full-stack work, TypeScript, GraphQL, SQL or NoSQL databases, writing tests. Nice to have: experience with event-driven systems, feature flags and A/B experiments. You will ship weekly and own your services in production.`,
  wiz: `Staff Frontend Engineer – Security Graph UI (Tel Aviv)
Lead the design of a data-heavy interface for exploring cloud security risks. Requirements: 8+ years of frontend experience, React and TypeScript, graph or large-table visualisation, strong API design sense. Nice to have: security background, WebGL. You will set technical direction for the UI group and partner with backend teams.`,
  checkpoint: `Senior Software Engineer – Web Management (Tel Aviv area)
Develop the web console of a security management product. Requirements: 5+ years with Angular or React, TypeScript, REST APIs, unit and end-to-end testing. Nice to have: networking or security knowledge. You will work in an agile team and take part in on-call.`,
  taboola: `Senior Frontend Engineer – Publisher Tools (Tel Aviv, hybrid)
Own the dashboards publishers use to control their sites' recommendations. Requirements: React, TypeScript, charts and large data sets, good eye for UX. Nice to have: experience with ad tech or analytics products.`,
};

export function demoData() {
  const companies = [
    // ── In process ──────────────────────────────────────────────────────────────────────────────────────────
    company('c1', 'Wix', 'wix.com', {
      position: 'Senior Frontend Engineer', careersUrl: '', jobText: posts.wix, last: -2, added: -13, cv: 'cv1',
      r: { li: 'wix-com', cb: 'wix', lv: 'wix', bl: 'Wix', cp: 'wix' },
      done: [0, 1, 2, 3], on: [4, 5],
      when: { 0: [-12], 1: [-10, '11:00'], 2: [-6, '16:00'], 4: [1, '11:00'] },
      say: { 1: 'Friendly call, 30 min. Hybrid, 3 days in the office.', 3: 'Small editor widget, took ~5 hours. Sent it with a README.', 4: 'Two engineers + a system design round.' },
      comments: 'Editor team. The recruiter says the decision comes within a week after the interview.',
      contacts: [{ name: 'Noa Barak', role: 'Recruiter', phone: '+972 50 000 0101', linkedin: 'https://www.linkedin.com/in/demo-noa-barak' }],
      notes: [['Tech interview', 'Prepare: rendering pipeline, virtualised lists, state management for a big canvas. Redo the system design practice (collaborative editor).']],
      action: ['Re-read my home assignment before tomorrow', '', -1],
      log: [['Send CV to Noa', -13, -12], ['Return the home assignment', -4, -2]],
      ai: {
        ago: -11,
        summary: 'A large public website-building platform with a big Tel Aviv engineering base. The editor team matches your performance and design-system background.',
        does: 'Lets individuals and businesses build and run websites with a visual editor, hosting, e-commerce and AI tools.',
        stage: 'Public company, founded 2006, HQ Tel Aviv.',
        matches: ['React + TypeScript at scale', 'Performance work (you cut a bundle by 40%)', 'Design system experience'],
        gaps: ['No canvas or SVG editor experience'], flags: ['Large company: ask how much ownership one engineer really gets'],
        job: {
          seniority: 'Senior', stack: ['React', 'TypeScript', 'Browser performance', 'Design systems'],
          mustHave: ['5+ years React and TypeScript', 'Browser performance and rendering', 'Large codebases'],
          niceToHave: ['Canvas / SVG', 'Accessibility', 'Micro-frontends'],
          matches: ['Design system used by 6 teams', 'Bundle size reduction', 'Mentoring'],
          gaps: ['Canvas / SVG'], prep: ['How the browser renders and repaints', 'Virtualisation and memoisation patterns', 'System design: a collaborative editor'],
          flags: ['Ask how the editor team splits work between squads'],
        },
      },
    }),
    company('c2', 'monday.com', 'monday.com', {
      position: 'Full Stack Engineer', jobText: posts.monday, last: -1, added: -9, cv: 'cv2',
      r: { li: 'mondaydotcom', cb: 'monday-com', lv: 'monday-com', bl: 'monday.com' },
      done: [0, 1], on: [2, 3, 4, 5], when: { 0: [-8], 1: [-5, '10:30'], 2: [0, '19:00'] },
      say: { 1: 'Asked about GraphQL and testing habits.' },
      contacts: [{ name: 'Yoav Mizrahi', role: 'Talent partner', phone: '+972 52 000 0202' }],
      action: ['Pick a time for the take-home', 'https://calendly.com/demo-monday/take-home', -1],
      ai: {
        ago: -7,
        summary: 'A work-management platform used by teams worldwide, with a strong product culture. The role is full-stack on the growth side.',
        does: 'Sells a customisable work operating system for planning projects, CRM and dev workflows.',
        stage: 'Public company, founded 2012, HQ Tel Aviv.',
        matches: ['Full-stack with Node.js and GraphQL', 'Weekly shipping culture'], gaps: ['Event-driven systems'], flags: [],
        job: {
          seniority: 'Mid-senior', stack: ['React', 'Node.js', 'TypeScript', 'GraphQL'], mustHave: ['4+ years full-stack', 'TypeScript', 'GraphQL', 'Databases'],
          niceToHave: ['Event-driven systems', 'A/B experiments'], matches: ['Fintech full-stack years', 'GraphQL migration'], gaps: ['Event-driven systems'],
          prep: ['GraphQL schema design', 'Feature flags and experiments', 'Debugging a slow endpoint'], flags: ['On-call expectations are unclear'],
        },
      },
    }),
    company('c3', 'Wiz', 'wiz.io', {
      position: 'Staff Frontend Engineer', jobText: posts.wiz, last: -4, added: -22, cv: 'cv1',
      r: { li: 'wizio', cb: 'wiz-5', lv: 'wiz', bl: 'Wiz' },
      done: [0, 1, 2, 3, 4], on: [5, 6],
      when: { 0: [-20], 1: [-18, '15:00'], 2: [-14, '12:00'], 4: [-4, '14:00'], 5: [5, '16:30'] },
      say: { 3: 'Graph explorer prototype. Good feedback on the data model.', 4: 'Strong signals. They liked the performance answers.' },
      comments: 'Fast process. Final round is with the head of the UI group.',
      contacts: [{ name: 'Tamar Peled', role: 'Recruiter', phone: '+972 54 000 0303' }, { name: 'Itay Segal', role: 'Hiring manager', phone: '', linkedin: '' }],
      notes: [['Manager / final', 'Prepare a 10 minute story about a project where I set technical direction. Ask about team size and roadmap.'], ['Salary', 'Check Levels.fyi for staff-level ranges before the offer call.']],
      action: ['Send two references to Tamar', '', -3],
      ai: {
        ago: -19,
        summary: 'A fast-growing cloud security company. The staff UI role is about data-heavy interfaces, which fits your performance and design-system work.',
        does: 'Scans cloud environments and shows security risks as a connected graph.', stage: 'Founded 2020, HQ Tel Aviv and New York.',
        matches: ['Data-heavy React UIs', 'Leading a design system', 'Mentoring'], gaps: ['No security background', 'No WebGL'], flags: ['Staff scope: ask what "setting direction" means day to day'],
        job: {
          seniority: 'Staff', location: 'Tel Aviv', workMode: 'Hybrid', stack: ['React', 'TypeScript', 'Data visualisation'],
          mustHave: ['8+ years frontend', 'React and TypeScript', 'Graph or large-table UI'], niceToHave: ['Security background', 'WebGL'],
          matches: ['8 years frontend', 'Design system lead'], gaps: ['Security domain', 'WebGL'], prep: ['Graph rendering at scale', 'API design for UIs', 'Leading without authority'],
          flags: ['Ask how the UI group is split from backend teams'],
        },
      },
    }),
    company('c4', 'Check Point', 'checkpoint.com', {
      position: 'Senior Software Engineer', jobText: posts.checkpoint, last: -3, added: -7,
      r: { li: 'check-point-software-technologies', cb: 'check-point-software-technologies', lv: 'check-point', bl: 'Check-Point' },
      done: [0, 1], on: [2, 3, 4], when: { 0: [-6], 1: [-3, '09:30'], 2: [3, '10:00'] },
      say: { 1: 'Asked about Angular vs React and testing.' },
      contacts: [{ name: 'Lior Katz', role: 'Recruiter', phone: '+972 53 000 0404' }],
      ai: {
        ago: -4,
        summary: 'A long-established security vendor. Stable, with a web console team that mostly uses Angular.',
        does: 'Sells network, cloud and endpoint security products and the consoles that manage them.', stage: 'Public company, founded 1993, HQ Tel Aviv area.',
        matches: ['Strong testing habits'], gaps: ['Angular is the main framework here', 'No networking background'], flags: ['Possible on-call'],
        job: {
          seniority: 'Senior', stack: ['Angular or React', 'TypeScript', 'REST'], mustHave: ['5+ years web', 'TypeScript', 'E2E testing'],
          niceToHave: ['Networking or security'], matches: ['Playwright and Jest'], gaps: ['Angular', 'Security domain'],
          prep: ['Angular basics refresher', 'REST API design', 'E2E testing strategy'], flags: ['Ask about on-call load'], source: 'pasted',
        },
      },
    }),
    company('c5', 'JFrog', 'jfrog.com', {
      position: 'Senior Full Stack Engineer', last: -5, added: -6,
      r: { li: 'jfrog-ltd', cb: 'jfrog', lv: 'jfrog' }, done: [0, 1], on: [2, 3, 4],
      when: { 0: [-5], 1: [-4, '13:00'] }, say: { 1: 'They will come back about next steps.' },
      contacts: [{ name: 'Shir Avraham', role: 'Recruiter', phone: '+972 50 000 0505' }],
      action: ['Follow up with Shir if I hear nothing by Thursday', '', -2],
      ai: {
        ago: -6, summary: 'A developer-tools company known for its software supply chain platform. Strong engineering culture, many teams.',
        does: 'Provides tools to store, scan and ship software packages and releases.', stage: 'Public company, founded 2008, HQ Netanya.',
        matches: ['Developer-facing products', 'Full-stack Node and React'], gaps: ['Go and Kubernetes appear in many teams'], flags: ['HQ is outside Tel Aviv: check the commute'],
      },
    }),
    company('c6', 'Papaya Global', 'papayaglobal.com', {
      position: 'Senior Frontend Engineer', last: -1, added: -3,
      r: { li: 'papaya-global', cb: 'papaya-global' }, done: [0], on: [1, 2, 3, 4],
      when: { 0: [-2], 1: [2, '15:30'] },
      contacts: [{ name: 'Gal Rosen', role: 'Recruiter', phone: '+972 58 000 0606' }],
      comments: 'Applied through their careers page. Recruiter wrote back the next day.',
    }),

    // ── Interested & approached me ──────────────────────────────────────────────────────────────────────────
    company('c7', 'Fiverr', 'fiverr.com', {
      position: 'Senior Frontend Engineer', status: 'approached', since: -2, last: -2, added: -2,
      r: { li: 'fiverr-com', cb: 'fiverr', lv: 'fiverr', bl: 'Fiverr' },
      contacts: [{ name: 'Hila Ben-David', role: 'Sourcer', phone: '+972 54 000 0707', linkedin: 'https://www.linkedin.com/in/demo-hila-ben-david' }],
      comments: 'Hila wrote to me on LinkedIn about a marketplace team.',
      action: ['Reply to Hila on LinkedIn', '', -2],
      ai: {
        ago: -2, summary: 'A global freelance marketplace. They reached out first, so ask what the team works on before agreeing to a call.',
        does: 'Runs an online marketplace where businesses buy services from freelancers.', stage: 'Public company, founded 2010, HQ Tel Aviv.',
        matches: ['Marketplace UI and performance'], gaps: [], flags: ['No job post yet: ask for one'],
      },
    }),
    company('c8', 'Cato Networks', 'catonetworks.com', {
      position: 'Frontend Team Lead', status: 'approached', since: -4, last: -4, added: -4,
      r: { li: 'cato-networks', cb: 'cato-networks' },
      contacts: [{ name: 'Eden Shapira', role: 'Recruiter', phone: '+972 52 000 0808' }],
      comments: 'Mid-size, private. A lead role would mean managing 4 people.',
    }),
    company('c9', 'Taboola', 'taboola.com', {
      position: 'Senior Frontend Engineer', status: 'interested', since: -1, last: null, added: -1,
      careersUrl: 'https://www.taboola.com/careers', jobText: posts.taboola, r: { li: 'taboola-com', lv: 'taboola', bl: 'Taboola' },
      comments: 'Pasted the job post. Next: press "✦ Analyze with AI".',
    }),
    company('c10', 'Lightricks', 'lightricks.com', {
      position: 'Frontend Engineer', status: 'interested', since: -3, last: null, added: -3,
      careersUrl: 'https://www.lightricks.com/careers', r: { li: 'lightricks', cb: 'lightricks' },
      comments: 'Creative apps. Would be a change from B2B. Worth a try.',
    }),

    // ── Rejected, withdrew & gone cold ──────────────────────────────────────────────────────────────────────
    company('c11', 'Payoneer', 'payoneer.com', {
      position: 'Senior Full Stack Engineer', status: 'cold', since: -2, last: -16, added: -19, r: { li: 'payoneer', cb: 'payoneer', lv: 'payoneer', bl: 'Payoneer' },
      done: [0, 1], on: [2, 3, 4], when: { 0: [-18], 1: [-16, '12:00'] }, say: { 1: 'They said they will update me in a week.' },
      contacts: [{ name: 'Ruth Golan', role: 'Recruiter', phone: '+972 50 000 1111' }],
      log: [['Send CV to Ruth', -19, -18]],
    }),
    company('c12', 'Riskified', 'riskified.com', {
      position: 'Senior Frontend Engineer', status: 'cold', since: -5, last: -17, added: -20, r: { li: 'riskified', cb: 'riskified', lv: 'riskified' },
      done: [0, 1, 2], on: [3, 4], when: { 0: [-19], 1: [-17, '10:00'], 2: [-17, '16:00'] }, say: { 2: 'Went well. Waiting for the home assignment.' },
    }),
    company('c13', 'Similarweb', 'similarweb.com', {
      position: 'Senior Frontend Engineer', status: 'rejected', since: -4, last: -4, added: -26, cv: 'cv1',
      closeReason: 'They wanted more experience with data visualisation libraries', r: { li: 'similarweb', cb: 'similarweb', lv: 'similarweb', bl: 'Similarweb' },
      done: [0, 1, 2, 3, 4], on: [5], when: { 0: [-25], 1: [-22, '11:00'], 2: [-17, '15:00'], 4: [-6, '10:00'] },
      say: { 3: 'Dashboard task. Good, but light on charts.', 4: 'Charting questions were my weak part.' },
      notes: [['Lesson', 'Practise D3 / charting basics before data-heavy roles.']],
      ai: {
        ago: -24, summary: 'A market-intelligence company with data-heavy web products. Charting skills matter more than general React depth.',
        does: 'Sells web traffic and market data to marketing and sales teams.', stage: 'Public company, founded 2007, HQ Tel Aviv.',
        matches: ['React and TypeScript'], gaps: ['Charting libraries (D3)'], flags: [],
      },
    }),
    company('c14', 'Gong', 'gong.io', {
      position: 'Senior Full Stack Engineer', status: 'rejected', since: -9, last: -9, added: -21,
      closeReason: 'Position filled internally', r: { li: 'gong-io', cb: 'gong', lv: 'gong', bl: 'Gong' },
      done: [0, 1, 2], on: [3, 4], when: { 0: [-20], 1: [-16, '09:30'], 2: [-9, '14:00'] },
    }),
    company('c15', 'Lemonade', 'lemonade.com', {
      position: 'Senior Frontend Engineer', status: 'withdrawn', since: -6, last: -6, added: -15,
      closeReason: 'Role is on-site 5 days a week, I need hybrid', r: { li: 'lemonade-inc', cb: 'lemonade', lv: 'lemonade' },
      done: [0, 1], on: [2], when: { 0: [-14], 1: [-6, '11:30'] }, say: { 1: 'Learned on the call that the office is 5 days.' },
    }),
  ];
  return {
    stageDefaultsV2: true, stages, companies, cvs: CVS,
    bookmarks: [
      { id: 'b1', title: 'Levels.fyi – salaries by level', url: 'https://www.levels.fyi' },
      { id: 'b2', title: 'Glassdoor – reviews & interview questions', url: 'https://www.glassdoor.com' },
    ],
  };
}
