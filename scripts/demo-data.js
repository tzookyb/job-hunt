// Fictional sample data for trying the app (and for the README screenshots). Dates are relative to today, so the
// demo always has upcoming meetings.
const day = (offset, time = '') => {
  const d = new Date(Date.now() + offset * 864e5);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10) + (time ? 'T' + time : '');
};
const logo = (letter, bg) => 'data:image/svg+xml,' + encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><rect width="40" height="40" rx="9" fill="${bg}"/><text x="20" y="27" font-family="Arial,sans-serif" font-size="20" font-weight="700" fill="#fff" text-anchor="middle">${letter}</text></svg>`);

const STAGES = ['Applied', 'HR Initial', 'Tech phone', 'Home assignment', 'Tech interview', 'Manager / final', 'Offer'];
const stages = STAGES.map((name, i) => ({ id: 's' + i, name, defaultOn: i < 2 }));

// [done stages, enabled stages, meetings { stageIndex: [dayOffset, time] }, comments { stageIndex: text }]
function company(id, name, color, extra, plan) {
  const [done, enabled, meetings = {}, comments = {}] = plan;
  return {
    id, name, logo: logo(name[0], color), position: 'Senior Frontend Engineer', website: '', careersUrl: '', comments: '',
    status: 'active', closeReason: '', lastInteraction: '', createdAt: Date.now(),
    glassdoorUrl: '', linkedinUrl: '', crunchbaseUrl: '', levelsUrl: '', blindUrl: '', comparablyUrl: '',
    contacts: [{ id: id + 'p', name: '', role: '', phone: '', linkedin: '' }],
    order: stages.map(s => s.id),
    stages: Object.fromEntries(stages.map((s, i) => [s.id, {
      enabled: enabled.includes(i), done: done.includes(i), comment: comments[i] || '',
      meeting: meetings[i] ? day(...meetings[i]) : '',
    }])),
    notes: [],
    ...extra,
  };
}

export function demoData() {
  return {
    stageDefaultsV2: true,
    stages,
    companies: [
      company('c1', 'Northwind Labs', '#2563eb', {
        website: 'https://northwind.example', lastInteraction: day(-1),
        contacts: [{ id: 'c1p', name: 'Maya Cohen', role: 'Recruiter', phone: '+972 54 000 0000', linkedin: '' }],
        notes: [{ id: 'n1', title: 'Tech phone', body: 'React rendering, hooks pitfalls, a small live-coding task (debounce).' }],
        comments: 'Developer tools. Hybrid, 3 days in the office.',
      }, [[0, 1], [0, 1, 2, 4, 5], { 2: [1, '10:30'] }, { 1: 'Friendly call, ~30 min' }]),
      company('c2', 'Bluefin AI', '#0d9488', { lastInteraction: day(-3), status: 'active' },
        [[0, 1, 2], [0, 1, 2, 3, 4, 5], { 3: [4, '23:59'] }, { 3: 'Build a small dashboard, 4 hours' }]),
      company('c3', 'Orbit Payments', '#9333ea', { lastInteraction: day(-9), status: 'active' },
        [[0], [0, 1], {}, {}]),
      company('c4', 'Cedar Systems', '#ea580c', { status: 'approached', lastInteraction: day(-2) },
        [[], [0, 1], { 1: [6, '14:00'] }, {}]),
      company('c5', 'Lumen Mobility', '#ca8a04', { status: 'interested', position: 'Frontend Engineer' }, [[], [0, 1], {}, {}]),
      company('c6', 'Quanta Health', '#dc2626', { status: 'rejected', closeReason: 'Went with a candidate with more backend', lastInteraction: day(-12) },
        [[0, 1, 2], [0, 1, 2, 4], {}, {}]),
    ],
    bookmarks: [
      { id: 'b1', title: 'Job board', url: 'https://jobs.example' },
      { id: 'b2', title: 'Salary calculator', url: 'https://salary.example' },
    ],
  };
}
