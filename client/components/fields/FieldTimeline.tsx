import { getAgentById } from "@/lib/mock-helpers";
import type { FieldUpdate } from "@/types/models";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";

export function FieldTimeline({ updates }: { updates: FieldUpdate[] }) {
  return (
    <Card>
      <CardTitle className="mb-4">Field timeline</CardTitle>
      <div className="space-y-4">
        {updates.map((update) => {
          const agent = getAgentById(update.agentId);
          return (
            <div key={update.id} className="rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]">
              <div className="mb-2 flex items-center justify-between">
                <FieldStageBadge stage={update.stage} />
                <span className="text-xs text-zinc-500 dark:text-zinc-400">{update.timestamp}</span>
              </div>
              <CardDescription className="mb-1">{update.notes}</CardDescription>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">by {agent?.fullName ?? "Unknown agent"}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
