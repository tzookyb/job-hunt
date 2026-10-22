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
