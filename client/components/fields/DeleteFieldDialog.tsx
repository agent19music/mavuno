"use client";

import { AppModal } from "@/components/ui/AppModal";
import { Button } from "@/components/ui/Button";

export function DeleteFieldDialog({
  open,
  onOpenChange,
  fieldName,
  updatesCount,
  agentsCount,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fieldName: string;
  updatesCount: number;
  agentsCount: number;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}) {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${fieldName}?`}
      description={
        <>
          Removes the field, {updatesCount} update{updatesCount === 1 ? "" : "s"}, and unassigns{" "}
          {agentsCount} agent{agentsCount === 1 ? "" : "s"}. Cannot be undone.
        </>
      }
    >
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={() => onOpenChange(false)} disabled={busy}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="border-brand-red bg-brand-red text-white hover:border-brand-red hover:bg-[oklch(0.43_0.19_27.3)] hover:text-white"
          disabled={busy}
          onClick={() => void onConfirm()}
        >
          {busy ? "Deleting…" : "Delete field"}
        </Button>
      </div>
    </AppModal>
  );
}
