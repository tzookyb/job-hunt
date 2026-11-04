// How far along a company's process is, counting only the stages that apply to it.

export function progress(c) {
  const on = c.order.filter(id => c.stages[id]?.enabled);
  const done = on.filter(id => c.stages[id].done).length;
  return {
    done,
    total: on.length,
    pct: on.length ? Math.round(done / on.length * 100) : 0,
    next: on.find(id => !c.stages[id].done) || null,
    last: on.filter(id => c.stages[id].done).pop() || null,   // the latest completed stage
  };
}

// "Rejected after Phone interview": a closed company names the last stage it completed, not the one it didn't reach.
export const closedText = (label, lastName) => lastName ? `${label} after ${lastName}` : label;
