"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { AgentList } from "@/components/agents/AgentList";
import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { api } from "@/lib/api";
import type { ApiUser } from "@/types/models";
import type { Field } from "@/types/models";
import { fieldAgentIds } from "@/types/models";

function assignmentCounts(fields: Field[], agents: ApiUser[]) {
  const counts: Record<number, number> = {};
  for (const a of agents) counts[a.id] = 0;
  for (const f of fields) {
    for (const id of fieldAgentIds(f)) {
      counts[id] = (counts[id] ?? 0) + 1;
    }
  }
  return counts;
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<ApiUser[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    void (async () => {
      try {
        setPageError(null);
        const [a, f] = await Promise.all([api.agents(), api.fields()]);
        setAgents(a);
        setFields(f);
      } catch (e) {
        setPageError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => assignmentCounts(fields, agents), [fields, agents]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await api.createAgent({
        username: form.username,
        email: form.email,
        password: form.password,
        first_name: form.first_name || undefined,
        last_name: form.last_name || undefined,
      });
      setOpen(false);
      setForm({ username: "", email: "", password: "", first_name: "", last_name: "" });
      load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Agents</h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
            Field agents and assignment coverage.
          </p>
        </div>
        <AppModal
          open={open}
          onOpenChange={setOpen}
          trigger={
            <Dialog.Trigger
              className="flex h-12 items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
              nativeButton
            >
              Add agent
            </Dialog.Trigger>
          }
          title="Add field agent"
          description="Creates a login for a field agent. Share credentials securely."
        >
          <form onSubmit={(e) => void submit(e)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                required
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Temporary password</Label>
              <PasswordInput
                id="pw"
                required
                minLength={8}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fn">First name</Label>
                <Input
                  id="fn"
                  value={form.first_name}
                  onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="ln">Last name</Label>
                <Input
                  id="ln"
                  value={form.last_name}
                  onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                />
              </div>
            </div>
            {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating…" : "Create agent"}
              </Button>
            </div>
          </form>
        </AppModal>
      </div>

      {pageError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {pageError}{" "}
          <button type="button" className="underline" onClick={load}>
            Retry
          </button>
        </p>
      )}

      <AgentList agents={agents} assignedByAgentId={counts} basePath="/admin/agents" />
    </div>
  );
}
