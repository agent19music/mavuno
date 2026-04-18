import Link from "next/link";
import type { Field } from "@/types/models";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";
import { FieldStatusPill } from "@/components/fields/FieldStatusPill";

export function FieldCard({ field, basePath }: { field: Field; basePath: string }) {
  const href = `${basePath.replace(/\/$/, "")}/${field.id}`;

  return (
    <Link href={href} className="block">
      <Card className="transition-transform duration-[200ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <CardTitle>{field.name}</CardTitle>
            <CardDescription>{field.crop_type}</CardDescription>
          </div>
          <FieldStatusPill status={field.status} />
        </div>
        <div className="flex items-center justify-between">
          <FieldStageBadge stage={field.current_stage} />
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            planted {field.planting_date}
          </span>
        </div>
      </Card>
    </Link>
  );
}
