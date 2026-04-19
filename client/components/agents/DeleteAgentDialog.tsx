"use client";

import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/Button";

export function DeleteAgentDialog({
  open,
  onOpenChange,
  agentName,
  assignedFieldsCount,
  updatesCount,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agentName: string;
  assignedFieldsCount: number;
  updatesCount: number;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${agentName}?`}
      description={
        <>
          Removes the agent, unassigns {assignedFieldsCount} field{assignedFieldsCount === 1 ? "" : "s"}, and
          deletes {updatesCount} update{updatesCount === 1 ? "" : "s"} they created. Cannot be undone.
        </>
      }
    >
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="secondary"
          className="dark:border-white/[.145] hover:border-transparent hover:bg-black/[.04] dark:hover:bg-[#1a1a1a] active:bg-black/[.06] dark:active:bg-[#161616]"
          onClick={() => onOpenChange(false)}
          disabled={busy}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="border-brand-red bg-brand-red text-white hover:border-brand-red hover:bg-[oklch(0.43_0.19_27.3)] hover:text-white"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? "Deleting…" : "Delete agent"}
        </Button>
      </div>
    </AppModal>
  );
}
