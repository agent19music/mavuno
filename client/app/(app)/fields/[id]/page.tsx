import { notFound } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";
import { FieldStatusPill } from "@/components/fields/FieldStatusPill";
import { FieldTimeline } from "@/components/fields/FieldTimeline";
import { getAgentById, getFieldById, getUpdatesForField } from "@/lib/mock-helpers";

export default async function FieldDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const field = getFieldById(id);
  if (!field) return notFound();
  const updates = getUpdatesForField(id);
  const agent = field.assignedAgentId ? getAgentById(field.assignedAgentId) : null;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-black">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{field.name}</h1>
            <p className="mt-2 text-zinc-600 dark:text-zinc-400">{field.cropType} · planted {field.plantingDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <FieldStageBadge stage={field.currentStage} />
            <FieldStatusPill status={field.status} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-3">Field notes</CardTitle>
          <CardDescription>{field.notes}</CardDescription>
        </Card>
        <Card>
          <CardTitle className="mb-3">Assigned agent</CardTitle>
          <CardDescription>{agent?.fullName ?? "Unassigned"}</CardDescription>
        </Card>
      </section>

      <FieldTimeline updates={updates} />
    </div>
  );
}
