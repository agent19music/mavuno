"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { api } from "@/lib/api";
import { STAGE_OPTIONS } from "@/lib/field-stage";
import { displayUserName, fieldAgentIds, type ApiUser, type Field, type FieldStage } from "@/types/models";

const STAGE_ORDER: FieldStage[] = ["planted", "growing", "ready", "harvested"];

function computeDefaults(selected: Field[]) {
  if (selected.length < 2) {
    return {
      name: "",
      crop_type: "",
      planting_date: "",
      current_stage: "planted" as FieldStage,
      notes: "",
      assigned: [] as number[],
    };
  }
  const names = selected.map((f) => f.name);
  const crops = [...new Set(selected.map((f) => f.crop_type))];
  const agentSet = new Set<number>();
  for (const f of selected) for (const id of fieldAgentIds(f)) agentSet.add(id);
  return {
    name: names.join(" + "),
    crop_type: crops.join(", "),
    planting_date: defaultPlantingDate(selected),
    current_stage: defaultStage(selected),
    notes: selected
      .map((f) => f.notes?.trim())
      .filter(Boolean)
      .join("\n\n"),
    assigned: [...agentSet],
  };
}

function defaultStage(fields: Field[]): FieldStage {
  let best: FieldStage = "planted";
  let bestIdx = 99;
  for (const f of fields) {
    const i = STAGE_ORDER.indexOf(f.current_stage);
    if (i !== -1 && i < bestIdx) {
      bestIdx = i;
      best = f.current_stage;
    }
  }
  return best;
}

function defaultPlantingDate(fields: Field[]): string {
  const dates = fields.map((f) => f.planting_date).filter(Boolean);
  if (!dates.length) return "";
  return [...dates].sort()[0] ?? "";
}

export function MergeFieldsDialog({
  open,
  onOpenChange,
  selected,
  onMerged,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selected: Field[];
  onMerged: (field: Field) => void;
}) {
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [updateTotal, setUpdateTotal] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() => computeDefaults(selected));
  const selectedIdKey = selected
    .map((f) => f.id)
    .sort((a, b) => a - b)
    .join(",");

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setForm(computeDefaults(selected));
      setFormError(null);
    });
    void (async () => {
      try {
        const a = await api.agents();
        setAgents(a);
      } catch {
        setAgents([]);
      }
    })();
  }, [open, selectedIdKey, selected]);

  useEffect(() => {
    if (!open || selected.length < 2) {
      queueMicrotask(() => setUpdateTotal(null));
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const counts = await Promise.all(selected.map((f) => api.fieldUpdates(f.id)));
        if (!cancelled) setUpdateTotal(counts.reduce((acc, u) => acc + u.length, 0));
      } catch {
        if (!cancelled) setUpdateTotal(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, selected]);

  const uniqueAgents = useMemo(() => {
    const s = new Set<number>();
    for (const f of selected) for (const id of fieldAgentIds(f)) s.add(id);
    return s.size;
  }, [selected]);

  const summary =
    selected.length >= 2
      ? `${selected.length} fields${updateTotal != null ? ` · ${updateTotal} updates re-parented` : ""} · ${uniqueAgents} agents preserved`
      : "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.length < 2) return;
    setSaving(true);
    setFormError(null);
    try {
      const merged = await api.mergeFields({
        source_ids: selected.map((f) => f.id),
        name: form.name,
        crop_type: form.crop_type,
        planting_date: form.planting_date,
        current_stage: form.current_stage,
        notes: form.notes,
        assigned_agent_ids: form.assigned.length ? form.assigned : undefined,
      });
      toast.success("Fields merged");
      onMerged(merged);
      onOpenChange(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Merge failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title="Merge into new field"
      description="Source fields are removed; update history moves to the new field."
      contentClassName="w-[min(100%-2rem,36rem)]"
    >
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{summary}</p>
      <form onSubmit={(e) => void submit(e)} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mf-name">New field name</Label>
          <Input
            id="mf-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-crop">Crop type</Label>
          <Input
            id="mf-crop"
            required
            value={form.crop_type}
            onChange={(e) => setForm((f) => ({ ...f, crop_type: e.target.value }))}
          />
        </div>
        <DatePickerField
          id="mf-date"
          label="Planting date"
          required
          value={form.planting_date}
          onChange={(planting_date) => setForm((f) => ({ ...f, planting_date }))}
        />
        <div className="space-y-2">
          <Label htmlFor="mf-stage">Stage</Label>
          <select
            id="mf-stage"
            className="flex h-12 w-full rounded-lg border border-[var(--border-strong)] bg-inset-surface pl-4 pr-10 text-base text-foreground outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            value={form.current_stage}
            onChange={(e) => setForm((f) => ({ ...f, current_stage: e.target.value as FieldStage }))}
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mf-notes">Notes</Label>
          <textarea
            id="mf-notes"
            rows={3}
            className="w-full rounded-lg border border-[var(--border-strong)] bg-inset-surface px-4 py-3 text-base text-foreground outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label>Assigned agents</Label>
          <div className="flex max-h-36 flex-col overflow-y-auto rounded-lg border border-[var(--border-strong)] bg-inset-surface p-1.5">
            {agents.map((a) => (
              <label
                key={a.id}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm transition-colors duration-[200ms] ease-[var(--ease-out)] hover:bg-hover-surface"
              >
                <Checkbox
                  checked={form.assigned.includes(a.id)}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      assigned: e.target.checked
                        ? [...f.assigned, a.id]
                        : f.assigned.filter((id) => id !== a.id),
                    }))
                  }
                />
                {displayUserName(a)}
              </label>
            ))}
          </div>
        </div>
        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || selected.length < 2}>
            {saving ? "Merging…" : "Merge fields"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
