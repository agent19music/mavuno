"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { FieldList } from "@/components/fields/FieldList";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { api } from "@/lib/api";
import {
  displayUserName,
  fieldAgentIds,
  type ApiUser,
  type Field,
  type FieldUpdate,
} from "@/types/models";

export default function AdminAgentDetailPage() {
  const params = useParams();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<ApiUser | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Number.isNaN(agentId)) return;
    let c = false;
    void (async () => {
      try {
        const [agentsList, allFields, allUpdates] = await Promise.all([
          api.agents(),
          api.fields(),
          api.updates(40),
        ]);
        const found = agentsList.find((a) => a.id === agentId) ?? null;
        if (!c) {
          setAgent(found);
          setFields(allFields.filter((f) => fieldAgentIds(f).includes(agentId)));
          setUpdates(allUpdates.filter((u) => u.agent.id === agentId));
        }
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      c = true;
    };
  }, [agentId]);

  const name = useMemo(() => (agent ? displayUserName(agent) : ""), [agent]);

  if (Number.isNaN(agentId)) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Invalid agent.</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!agent) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="flex items-center gap-4 p-6">
        <Avatar name={name} className="size-14 text-base" />
        <div>
          <CardTitle>{name}</CardTitle>
          <CardDescription>{agent.email}</CardDescription>
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">Assigned fields</h2>
        <FieldList fields={fields} basePath="/admin/fields" />
      </section>

      <ActivityFeed updates={updates} title="Agent activity" />
    </div>
  );
}
