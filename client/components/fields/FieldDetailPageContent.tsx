"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { DeleteFieldDialog } from "@/components/fields/DeleteFieldDialog";
import { FieldStageBadge } from "@/components/fields/FieldStageBadge";
import { FieldStatusPill } from "@/components/fields/FieldStatusPill";
import { FieldTimeline } from "@/components/fields/FieldTimeline";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Label } from "@/components/ui/Label";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/useNotifications";
import { STAGE_OPTIONS, canTransitionTo } from "@/lib/field-stage";
import {
  displayUserName,
  fieldAgentIds,
  type ApiUser,
  type Field,
  type FieldStage,
} from "@/types/models";

export function FieldDetailPageContent({
  fieldId,
  isAdmin,
  listHref,
}: {
  fieldId: number;
  isAdmin: boolean;
  listHref: string;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const { subscribeFieldRemoval } = useNotifications();
  const [field, setField] = useState<Field | null>(null);
  const [updates, setUpdates] = useState<Awaited<ReturnType<typeof api.fieldUpdates>>>([]);
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [notes, setNotes] = useState("");
  const [stage, setStage] = useState<FieldStage>("planted");
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setError(null);
        const [f, u, ag] = await Promise.all([
          api.field(fieldId),
          api.fieldUpdates(fieldId),
          isAdmin ? api.agents() : Promise.resolve([] as ApiUser[]),
        ]);
        if (cancelled) return;
        setField(f);
        setUpdates(u);
        setAgents(ag);
        setNotes(f.notes);
        setStage(f.current_stage);
        setSelectedAgents(fieldAgentIds(f));
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Failed to load field";
        if (/not\s*found/i.test(msg)) {
          toast.message("This field is no longer available.");
          router.replace(listHref);
          return;
        }
        setError(msg);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fieldId, isAdmin, listHref, router]);

  useEffect(() => {
    return subscribeFieldRemoval(fieldId, () => {
      router.replace(listHref);
    });
  }, [fieldId, listHref, router, subscribeFieldRemoval]);

  if (error && !field) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">
        {error}{" "}
        <button type="button" className="underline" onClick={() => router.push(listHref)}>
          Back
        </button>
      </p>
    );
  }

  if (!field) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  const canEdit =
    isAdmin || (user ? fieldAgentIds(field).includes(user.id) : false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (isAdmin) {
        const updated = await api.updateField(field.id, {
          notes,
          current_stage: stage,
          assigned_agent_ids: selectedAgents,
        });
        setField(updated);
        setStage(updated.current_stage);
        setNotes(updated.notes);
        setSelectedAgents(fieldAgentIds(updated));
      } else {
        const updated = await api.updateField(field.id, {
          notes,
          current_stage: stage,
        });
        setField(updated);
        setStage(updated.current_stage);
        setNotes(updated.notes);
      }
      const u = await api.fieldUpdates(field.id);
      setUpdates(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!isAdmin || !field) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteField(field.id);
      toast.success("Field deleted");
      setDeleteOpen(false);
      router.replace(listHref);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <section className="rounded-xl border border-black/[.08] bg-card p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[.08] dark:shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{field.name}</h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
              {field.crop_type} · planted {field.planting_date}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FieldStageBadge stage={field.current_stage} />
            <FieldStatusPill status={field.status} />
          </div>
        </div>
      </section>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {canEdit && (
        <Card className="space-y-4 p-6">
          <CardTitle>Update field</CardTitle>
          <div className="space-y-2">
            <Label htmlFor="stage">Stage</Label>
            <select
              id="stage"
              className="flex h-12 w-full rounded-lg border border-[var(--border-strong)] bg-inset-surface pl-4 pr-10 text-base text-foreground outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={stage}
              onChange={(e) => setStage(e.target.value as FieldStage)}
            >
              {STAGE_OPTIONS.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  disabled={!canTransitionTo(field.current_stage, opt.value)}
                >
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Only same stage or the next lifecycle step is allowed.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              rows={4}
              className="w-full rounded-lg border border-[var(--border-strong)] bg-inset-surface px-4 py-3 text-base text-foreground outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {isAdmin && (
            <div className="space-y-2">
              <Label>Assigned agents</Label>
              <div className="flex max-h-40 flex-col overflow-y-auto rounded-lg border border-[var(--border-strong)] bg-inset-surface p-1.5">
                {agents.map((a) => (
                  <label
                    key={a.id}
                    className="flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors duration-[200ms] ease-[var(--ease-out)] hover:bg-hover-surface"
                  >
                    <Checkbox
                      checked={selectedAgents.includes(a.id)}
                      onChange={(e) => {
                        setSelectedAgents((prev) =>
                          e.target.checked ? [...prev, a.id] : prev.filter((id) => id !== a.id)
                        );
                      }}
                    />
                    {displayUserName(a)}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </Button>
            {isAdmin && (
              <Button type="button" variant="secondary" onClick={() => setDeleteOpen(true)}>
                Delete field
              </Button>
            )}
          </div>
        </Card>
      )}

      {isAdmin && field ? (
        <DeleteFieldDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          fieldName={field.name}
          updatesCount={updates.length}
          agentsCount={fieldAgentIds(field).length}
          onConfirm={() => void remove()}
          busy={deleting}
        />
      ) : null}

      {!canEdit && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          You do not have permission to update this field.
        </p>
      )}

      <section className="grid gap-4 xl:grid-cols-2">
        <Card className="p-6">
          <CardTitle className="mb-3">Field notes</CardTitle>
          <CardDescription>{field.notes || "—"}</CardDescription>
        </Card>
        <Card className="p-6">
          <CardTitle className="mb-3">Assigned agents</CardTitle>
          <CardDescription>
            {fieldAgentIds(field).length === 0
              ? "Unassigned"
              : (field.assigned_agents?.length
                  ? field.assigned_agents.map((a) => displayUserName(a))
                  : fieldAgentIds(field).map((id) => {
                      const ag = agents.find((x) => x.id === id);
                      return ag ? displayUserName(ag) : `#${id}`;
                    })
                ).join(", ")}
          </CardDescription>
        </Card>
      </section>

      <FieldTimeline updates={updates} />
    </div>
  );
}
