import type { Field, FieldStage, FieldUpdate } from "@/types/models";

const STAGES: FieldStage[] = ["planted", "growing", "ready", "harvested"];

const stageLabel: Record<FieldStage, string> = {
  planted: "Planted",
  growing: "Growing",
  ready: "Ready",
  harvested: "Harvested",
};

export function aggregateFieldsByStage(fields: Field[]) {
  return STAGES.map((stage) => ({
    stage: stageLabel[stage],
    total: fields.filter((f) => f.current_stage === stage).length,
  })).filter((x) => x.total > 0);
}

/** Merge updates into daily counts for chart (month-day axis). */
export function mergeUpdatesByDate(updates: FieldUpdate[]) {
  const map = new Map<string, number>();
  for (const u of updates) {
    const d = u.timestamp.slice(0, 10);
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, n]) => ({ date: date.slice(5), updates: n }));
}
