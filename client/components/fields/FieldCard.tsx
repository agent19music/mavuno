import { memo } from "react";
import Link from "next/link";
import type { Field } from "@/types/models";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";
import { FieldStatusPill } from "@/components/fields/FieldStatusPill";
import { cn } from "@/lib/utils";

function FieldCardImpl({
  field,
  basePath,
  selectMode = false,
  selected = false,
  onToggleSelect,
}: {
  field: Field;
  basePath: string;
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: number) => void;
}) {
  const href = `${basePath.replace(/\/$/, "")}/${field.id}`;

  const card = (
    <Card
      className={cn(
        "relative transition-transform duration-[200ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)] motion-reduce:transition-shadow motion-reduce:hover:translate-y-0",
        selected && "ring-1 ring-[var(--accent)]"
      )}
    >
      {selectMode ? (
        <span
          className="absolute right-4 top-4 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
          role="presentation"
        >
          <Checkbox
            checked={selected}
            onChange={() => onToggleSelect?.(field.id)}
            aria-label={`Select ${field.name}`}
          />
        </span>
      ) : null}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <CardTitle>{field.name}</CardTitle>
          <CardDescription>{field.crop_type}</CardDescription>
        </div>
        <FieldStatusPill status={field.status} />
      </div>
      <div className="flex items-center justify-between">
        <FieldStageBadge stage={field.current_stage} />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">planted {field.planting_date}</span>
      </div>
    </Card>
  );

  if (selectMode) {
    return (
      <button type="button" className="block w-full text-left" onClick={() => onToggleSelect?.(field.id)}>
        {card}
      </button>
    );
  }

  return (
    <Link href={href} className="block">
      {card}
    </Link>
  );
}

export const FieldCard = memo(FieldCardImpl);
