"use client";

import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { FieldsByStageChart } from "@/components/charts/FieldsByStageChart";
import { UpdatesTrendChart } from "@/components/charts/UpdatesTrendChart";
import { api } from "@/lib/api";
import { aggregateFieldsByStage, mergeUpdatesByDate } from "@/lib/chart-helpers";
import type { Field } from "@/types/models";
import type { FieldUpdate } from "@/types/models";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<{
    total_fields: number;
    status_breakdown: Record<string, number>;
    total_agents: number;
    recent_updates: number;
  } | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [d, f, u] = await Promise.all([
          api.dashboardAdmin(),
          api.fields(),
          api.updates(24),
        ]);
        if (!cancelled) {
          setStats(d);
          setFields(f);
          setUpdates(u);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {error}{" "}
        <button type="button" className="underline" onClick={() => window.location.reload()}>
          Retry
        </button>
      </p>
    );
  }

  if (!stats) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  const atRisk = stats.status_breakdown.at_risk ?? 0;
  const stageData = aggregateFieldsByStage(fields);
  const trendData = mergeUpdatesByDate(updates);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          All fields overview — coordinators only.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardTitle className="text-sm">Fields</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{stats.total_fields}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">Agents</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{stats.total_agents}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">Updates (7d)</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{stats.recent_updates}</p>
        </Card>
        <Card>
          <CardTitle className="text-sm">At risk</CardTitle>
          <p className="mt-2 text-3xl font-semibold">{atRisk}</p>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Fields by stage</CardTitle>
          {stageData.length === 0 ? (
            <p className="text-sm text-[var(--foreground-subtle)]">No field data.</p>
          ) : (
            <FieldsByStageChart data={stageData} />
          )}
        </Card>
        <Card>
          <CardTitle className="mb-4">Updates trend</CardTitle>
          {trendData.length === 0 ? (
            <p className="text-sm text-[var(--foreground-subtle)]">No updates yet.</p>
          ) : (
            <UpdatesTrendChart points={trendData} />
          )}
        </Card>
      </section>

      <ActivityFeed updates={updates.slice(0, 5)} title="Recent updates" />
    </div>
  );
}
