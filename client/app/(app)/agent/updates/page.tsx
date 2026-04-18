"use client";

import { useEffect, useState } from "react";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { api } from "@/lib/api";
import type { FieldUpdate } from "@/types/models";

export default function AgentUpdatesPage() {
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const u = await api.updates(50);
        if (!c) setUpdates(u);
      } catch (e) {
        if (!c) setError(e instanceof Error ? e.message : "Failed");
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (updates.length === 0 && !error) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Updates</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Your field update history.
        </p>
      </div>
      <ActivityFeed updates={updates} title="Your updates" />
    </div>
  );
}
