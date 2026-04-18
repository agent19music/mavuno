import type { FieldStage } from "@/types/models";
import { Badge } from "@/components/ui/Badge";

export function FieldStageBadge({ stage }: { stage: FieldStage }) {
  return <Badge tone="neutral">{stage}</Badge>;
}
