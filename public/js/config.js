// App-wide constants.

export const DEFAULT_STAGES = ['Applied', 'HR phone', 'Tech phone', 'Home assignment', 'Tech interview', 'Manager / final', 'Offer'];

export const STATUSES = [
  ['active', 'In process'],
  ['offer', 'Offer'],
  ['rejected', 'Rejected'],
  ['withdrawn', 'Withdrew'],
  ['closed', 'Closed / done'],
];
export const CLOSED = ['rejected', 'withdrawn', 'closed'];

export const statusLabel = key => (STATUSES.find(s => s[0] === key) || [, key])[1];
export const isClosed = c => CLOSED.includes(c.status);
