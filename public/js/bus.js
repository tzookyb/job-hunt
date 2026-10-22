// A tiny publish/subscribe bus, so modules can react to each other without importing each other.
const handlers = new Map();

export function on(event, fn) {
  if (!handlers.has(event)) handlers.set(event, new Set());
  handlers.get(event).add(fn);
  return () => handlers.get(event).delete(fn);
}

export function emit(event, payload) {
  for (const fn of handlers.get(event) || []) fn(payload);
}
