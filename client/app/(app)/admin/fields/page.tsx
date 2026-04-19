"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CreateFieldDialog } from "@/components/fields/CreateFieldDialog";
import { FieldList } from "@/components/fields/FieldList";
import { MergeFieldsDialog } from "@/components/fields/MergeFieldsDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { api } from "@/lib/api";
import type { Field, FieldStage, FieldStatus } from "@/types/models";
import { cn } from "@/lib/utils";

export default function AdminFieldsPage() {
  const [fields, setFields] = useState<Field[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FieldStatus | "all">("all");
  const [stage, setStage] = useState<FieldStage | "all">("all");
  const [error, setError] = useState<string | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set());
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);

  const load = useCallback(() => {
    void (async () => {
      try {
        setError(null);
        const data = await api.fields();
        setFields(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleSelect = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return fields.filter((f) => {
      const okQ =
        q.length === 0 || f.name.toLowerCase().includes(q) || f.crop_type.toLowerCase().includes(q);
      const okS = status === "all" || f.status === status;
      const okSt = stage === "all" || f.current_stage === stage;
      return okQ && okS && okSt;
    });
  }, [fields, query, status, stage]);

  const selectedFields = useMemo(() => {
    const list = fields.filter((f) => selectedIds.has(f.id));
    list.sort((a, b) => a.id - b.id);
    return list;
  }, [fields, selectedIds]);

  const selectionCount = selectedIds.size;
  const mergeBarVisible = selectMode && selectionCount >= 2;

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fields</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            All monitored farm fields.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              if (selectMode) exitSelectMode();
              else setSelectMode(true);
            }}
          >
            {selectMode ? "Done selecting" : "Select"}
          </Button>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            New field
          </Button>
        </div>
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

      <FieldList
        fields={filtered}
        basePath="/admin/fields"
        selectMode={selectMode}
        selectedIds={selectedIds}
        onToggleSelect={selectMode ? toggleSelect : undefined}
      />

      <CreateFieldDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          load();
        }}
      />

      <MergeFieldsDialog
        open={mergeOpen}
        onOpenChange={setMergeOpen}
        selected={selectedFields}
        onMerged={() => {
          exitSelectMode();
          load();
        }}
      />

      <div
        className={cn(
          "fixed inset-x-4 bottom-4 z-30 flex translate-y-[calc(100%+1rem)] items-center justify-between gap-4 rounded-[var(--radius-md)] border border-black/[.08] bg-popover px-4 py-3 shadow-[0_16px_48px_rgba(0,0,0,0.08)] transition-transform duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] motion-reduce:transition-none md:left-auto md:right-8 md:max-w-lg md:translate-x-0",
          mergeBarVisible ? "pointer-events-auto translate-y-0" : "pointer-events-none"
        )}
        aria-hidden={!mergeBarVisible}
      >
        <p className="text-sm text-foreground">
          {selectionCount} field{selectionCount === 1 ? "" : "s"} selected
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={exitSelectMode}>
            Cancel
          </Button>
          <Button type="button" onClick={() => setMergeOpen(true)} disabled={selectionCount < 2}>
            Merge ({selectionCount})
          </Button>
        </div>
      </div>
    </div>
  );
}
