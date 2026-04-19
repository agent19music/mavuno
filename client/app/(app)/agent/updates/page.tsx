"use client";

import { useEffect, useState } from "react";
import { FileText } from "@phosphor-icons/react/dist/ssr";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { api } from "@/lib/api";
import type { FieldUpdate } from "@/types/models";

export default function AgentUpdatesPage() {
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const u = await api.updates(50);
        if (!c) setUpdates(u);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed to load updates");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Updates</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Your field update history.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : loading ? (
        <Card className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-14 animate-pulse rounded-lg bg-inset-surface/70"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </Card>
      ) : updates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <span className="inline-flex size-10 items-center justify-center rounded-full bg-inset-surface text-zinc-500 dark:text-zinc-400">
            <FileText size={20} />
          </span>
          <CardTitle className="text-base">No updates yet</CardTitle>
          <CardDescription className="max-w-xs">
            Log your first stage change or note from a field, and it will show up here.
          </CardDescription>
        </Card>
      ) : (
        <ActivityFeed updates={updates} title="Your updates" />
      )}
    </div>
  );
}
