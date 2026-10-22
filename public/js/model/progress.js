// How far along a company's process is, counting only the stages that apply to it.

export function progress(c, stageOrder) {
  const on = stageOrder.filter(id => c.stages[id]?.enabled);
  const done = on.filter(id => c.stages[id].done).length;
  return {
    done,
    total: on.length,
    pct: on.length ? Math.round(done / on.length * 100) : 0,
    next: on.find(id => !c.stages[id].done) || null,
  };
}
