import { notFound } from "next/navigation";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { FieldList } from "@/components/fields/FieldList";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { getAgentById, getFieldsForAgent, getUpdatesForAgent } from "@/lib/mock-helpers";

export default async function AgentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const agent = getAgentById(id);
  if (!agent) return notFound();
  const assignedFields = getFieldsForAgent(id);
  const updates = getUpdatesForAgent(id);

  return (
    <div className="space-y-6">
      <Card className="flex items-center gap-4">
        <Avatar name={agent.fullName} className="size-14 text-base" />
        <div>
          <CardTitle>{agent.fullName}</CardTitle>
          <CardDescription>{agent.email}</CardDescription>
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-xl font-semibold tracking-tight">Assigned fields</h2>
        <FieldList fields={assignedFields} />
      </section>

      <ActivityFeed updates={updates} title="Agent activity" />
    </div>
  );
}
