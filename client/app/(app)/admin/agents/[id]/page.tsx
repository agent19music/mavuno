"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { DeleteAgentDialog } from "@/components/agents/DeleteAgentDialog";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { FieldList } from "@/components/fields/FieldList";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
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
  const router = useRouter();
  const agentId = Number(params.id);
  const [agent, setAgent] = useState<ApiUser | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [updates, setUpdates] = useState<FieldUpdate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [profile, setProfile] = useState({
    first_name: "",
    last_name: "",
    email: "",
    username: "",
  });

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

  useEffect(() => {
    if (!agent) return;
    setProfile({
      first_name: agent.first_name ?? "",
      last_name: agent.last_name ?? "",
      email: agent.email ?? "",
      username: agent.username ?? "",
    });
    setSaveError(null);
  }, [agent]);

  if (Number.isNaN(agentId)) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Invalid agent.</p>;
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>;
  }

  if (!agent) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  const handleCancel = () => {
    setProfile({
      first_name: agent.first_name ?? "",
      last_name: agent.last_name ?? "",
      email: agent.email ?? "",
      username: agent.username ?? "",
    });
    setSaveError(null);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.updateAgent(agent.id, {
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        email: profile.email.trim(),
        username: profile.username.trim(),
      });
      setAgent(updated);
      setIsEditing(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to update agent.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setSaveError(null);
    try {
      await api.deleteAgent(agent.id);
      toast.success("Agent deleted");
      setDeleteOpen(false);
      router.replace("/admin/agents");
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Failed to delete agent.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <Card className="flex items-center gap-4 p-6">
        <Avatar name={name} className="size-14 text-base" />
        <div className="w-full">
          {!isEditing ? (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>{name}</CardTitle>
                <CardDescription>{agent.email}</CardDescription>
              </div>
              <div className="flex flex-wrap justify-end gap-3">
                <Button variant="secondary" onClick={() => setIsEditing(true)}>
                  Edit agent
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleting}>
                  Delete agent
                </Button>
              </div>
            </div>
          ) : (
            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleSave();
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="first_name">First name</Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, first_name: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Last name</Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, last_name: event.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={profile.email}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, email: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    required
                    value={profile.username}
                    onChange={(event) =>
                      setProfile((prev) => ({ ...prev, username: event.target.value }))
                    }
                  />
                </div>
              </div>
              {saveError ? <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p> : null}
              <div className="flex flex-wrap justify-end gap-3">
                <Button type="button" variant="secondary" onClick={handleCancel} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving…" : "Save changes"}
                </Button>
                <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)} disabled={deleting || saving}>
                  Delete agent
                </Button>
              </div>
            </form>
          )}
        </div>
      </Card>

      <section>
        <h2 className="mb-4 text-lg font-semibold tracking-tight sm:text-xl">Assigned fields</h2>
        <FieldList fields={fields} basePath="/admin/fields" />
      </section>

      <ActivityFeed updates={updates} title="Agent activity" />

      <DeleteAgentDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        agentName={name}
        assignedFieldsCount={fields.length}
        updatesCount={updates.length}
        onConfirm={() => void handleDelete()}
        busy={deleting}
      />
    </div>
  );
}
