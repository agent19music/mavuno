"use client";

import { useEffect, useMemo, useState } from "react";
import { FieldList } from "@/components/fields/FieldList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { api } from "@/lib/api";
import type { Field, FieldStage, FieldStatus } from "@/types/models";

export default function AgentFieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FieldStatus | "all">("all");
  const [stage, setStage] = useState<FieldStage | "all">("all");
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    void (async () => {
      try {
        setError(null);
        const data = await api.fields();
        setFields(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      const okQ =
        q.length === 0 ||
        f.name.toLowerCase().includes(q) ||
        f.crop_type.toLowerCase().includes(q);
      const okS = status === "all" || f.status === status;
      const okSt = stage === "all" || f.current_stage === stage;
      return okQ && okS && okSt;
    });
  }, [fields, query, status, stage]);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">My fields</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Fields assigned to you.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}{" "}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Input
          placeholder="Search fields..."
          className="col-span-2 md:col-span-2"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="button" variant="secondary" onClick={() => setStatus((s) => (s === "all" ? "active" : "all"))}>
          Status: {status === "all" ? "Any" : status}
        </Button>
        <Button type="button" variant="secondary" onClick={() => setStage((s) => (s === "all" ? "growing" : "all"))}>
          Stage: {stage === "all" ? "Any" : stage}
        </Button>
      </section>

      <FieldList fields={filtered} basePath="/agent/fields" />
    </div>
  );
}
