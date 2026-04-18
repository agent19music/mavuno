import type { FieldStatus } from "@/types/models";
import { Badge } from "@/components/ui/Badge";

export function FieldStatusPill({ status }: { status: FieldStatus }) {
  if (status === "at_risk") return <Badge tone="risk">At risk</Badge>;
  if (status === "active") return <Badge tone="active">Active</Badge>;
  return <Badge tone="neutral">Completed</Badge>;
}
