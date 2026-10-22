// App-wide constants.

export const DEFAULT_STAGES = ['Applied', 'HR phone', 'Tech phone', 'Home assignment', 'Tech interview', 'Manager / final', 'Offer'];

export const STATUSES = [
  ['interested', 'Interested'],      // I'm thinking of applying
  ['approached', 'Approached me'],   // they reached out first
  ['active', 'In process'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrew'],
];
export const CLOSED = ['rejected', 'withdrawn'];

// Statuses that were removed → what old data loads as.
export const OLD_STATUS = { offer: 'active', closed: 'withdrawn' };

export const statusLabel = key => (STATUSES.find(s => s[0] === key) || [, key])[1];
export const isClosed = c => CLOSED.includes(c.status);

// Company-research sites. The lookup fills the ones it finds; an empty field links to a search instead.
// field · label · domain (for the site: search) · tooltip
export const RESEARCH = [
  { field: 'glassdoorUrl', label: 'Glassdoor', domain: 'glassdoor.com', tip: 'Employee reviews, salaries and real interview questions. The Interviews tab is great prep before each stage.' },
  { field: 'linkedinUrl', label: 'LinkedIn', domain: 'linkedin.com/company', tip: 'Company page: headcount and growth, recent hires, open jobs, and which of your connections work there.' },
  { field: 'finderUrl', label: 'Startup Nation Finder', domain: 'finder.startupnationcentral.org', tip: 'Israeli startup database: funding stage, total raised, investors, headcount and sector. Covers small startups Glassdoor misses.' },
  { field: 'crunchbaseUrl', label: 'Crunchbase', domain: 'crunchbase.com/organization', tip: 'Funding rounds, investors and acquisitions. Helps judge runway and how stable the company is.' },
  { field: 'levelsUrl', label: 'Levels.fyi', domain: 'levels.fyi/companies', tip: 'Salary and equity by level. Useful before salary talks; best coverage for bigger tech companies.' },
  { field: 'blindUrl', label: 'Blind', domain: 'teamblind.com/company', tip: 'Anonymous posts by verified employees. Candid talk about culture, layoffs and pay, mostly at larger companies.' },
  { field: 'indeedUrl', label: 'Indeed', domain: 'indeed.com/cmp', tip: 'A second source of employee reviews and ratings, with decent coverage of larger employers.' },
  { field: 'comparablyUrl', label: 'Comparably', domain: 'comparably.com/companies', tip: 'Culture, leadership and pay ratings from employees. Mostly US companies.' },
];
