"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePickerField } from "@/components/ui/DatePickerField";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { api } from "@/lib/api";
import { STAGE_OPTIONS } from "@/lib/field-stage";
import { displayUserName, type ApiUser, type Field, type FieldStage } from "@/types/models";

export function CreateFieldDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (field: Field) => void;
}) {
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    crop_type: "",
    planting_date: "",
    current_stage: "planted" as FieldStage,
    notes: "",
    assigned: [] as number[],
  });

  const loadAgents = useCallback(() => {
    void (async () => {
      try {
        const a = await api.agents();
        setAgents(a);
      } catch {
        setAgents([]);
      }
    })();
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (next) setFormError(null);
    onOpenChange(next);
  };

  useEffect(() => {
    if (open) loadAgents();
  }, [open, loadAgents]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const created = await api.createField({
        name: form.name,
        crop_type: form.crop_type,
        planting_date: form.planting_date,
        current_stage: form.current_stage,
        notes: form.notes,
        assigned_agent_ids: form.assigned.length ? form.assigned : undefined,
      });
      toast.success("Field created");
      onCreated(created);
      handleOpenChange(false);
      setForm({
        name: "",
        crop_type: "",
        planting_date: "",
        current_stage: "planted",
        notes: "",
        assigned: [],
      });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create field");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppModal
      open={open}
      onOpenChange={handleOpenChange}
      title="Create field"
      description="Add a monitored field. You can assign agents after creation."
    >
      <form onSubmit={(e) => void submit(e)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nf-name">Name</Label>
          <Input
            id="nf-name"
            required
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nf-crop">Crop type</Label>
          <Input
            id="nf-crop"
            required
            value={form.crop_type}
            onChange={(e) => setForm((f) => ({ ...f, crop_type: e.target.value }))}
          />
        </div>
        <DatePickerField
          id="nf-date"
          label="Planting date"
          required
          value={form.planting_date}
          onChange={(planting_date) => setForm((f) => ({ ...f, planting_date }))}
        />
        <div className="space-y-2">
          <Label htmlFor="nf-stage">Stage</Label>
          <select
            id="nf-stage"
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
          <Label htmlFor="nf-notes">Notes</Label>
          <textarea
            id="nf-notes"
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
          <Button type="button" variant="secondary" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating…" : "Create field"}
          </Button>
        </div>
      </form>
    </AppModal>
  );
}
