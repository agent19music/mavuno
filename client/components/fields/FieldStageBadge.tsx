import type { FieldStage } from "@/types/models";
import { Badge } from "@/components/ui/Badge";

const labels: Record<FieldStage, string> = {
  planted: "Planted",
  growing: "Growing",
  ready: "Ready",
  harvested: "Harvested",
};

export function FieldStageBadge({ stage }: { stage: FieldStage }) {
  return <Badge tone="neutral">{labels[stage] ?? stage}</Badge>;
}
