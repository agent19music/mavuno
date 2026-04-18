import { getAgentById, getFieldById } from "@/lib/mock-helpers";
import type { FieldUpdate } from "@/types/models";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";

export function UpdateItem({ update }: { update: FieldUpdate }) {
  const field = getFieldById(update.fieldId);
  const agent = getAgentById(update.agentId);

  return (
    <article className="rounded-lg border border-black/[.08] bg-inset-surface p-4 dark:border-white/[.08]">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <div className="flex items-center gap-2">
          <FieldStageBadge stage={update.stage} />
          <span className="text-sm font-medium">{field?.name}</span>
        </div>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{update.timestamp}</span>
      </div>
      <p className="mb-1 text-sm text-zinc-700 dark:text-zinc-300">{update.notes}</p>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">by {agent?.fullName ?? "Unknown agent"}</p>
    </article>
  );
}
