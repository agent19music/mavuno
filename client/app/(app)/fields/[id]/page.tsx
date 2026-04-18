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
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-black/[.08] bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[.08] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{field.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              {field.cropType} · planted {field.plantingDate}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
