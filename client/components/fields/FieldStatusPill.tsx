import type { FieldStatus } from "@/types/models";
import { Badge } from "@/components/ui/Badge";

export function FieldStatusPill({ status }: { status: FieldStatus }) {
  if (status === "at-risk") return <Badge tone="risk">at-risk</Badge>;
  if (status === "active") return <Badge tone="active">active</Badge>;
  return <Badge tone="neutral">archived</Badge>;
}
