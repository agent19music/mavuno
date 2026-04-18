import type { FieldStage } from "@/types/models";

const ORDER: FieldStage[] = ["planted", "growing", "ready", "harvested"];

const idx = (s: FieldStage) => ORDER.indexOf(s);

/** Mirrors backend `Field.can_transition_to` (same or +1 step). */
export function canTransitionTo(current: FieldStage, next: FieldStage): boolean {
  if (!ORDER.includes(next)) return false;
  const i = idx(current);
  const j = idx(next);
  return j === i || j === i + 1;
}

export const STAGE_OPTIONS: { value: FieldStage; label: string }[] = [
  { value: "planted", label: "Planted" },
  { value: "growing", label: "Growing" },
  { value: "ready", label: "Ready" },
  { value: "harvested", label: "Harvested" },
];
