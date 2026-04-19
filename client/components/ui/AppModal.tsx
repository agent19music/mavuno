"use client";

import { Dialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type AppModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Optional trigger (e.g. `Dialog.Trigger`) — must live under the same `Dialog.Root`. */
  trigger?: ReactNode;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  /** Extra actions row below `children` (e.g. Cancel / Submit). */
  footer?: ReactNode;
  contentClassName?: string;
};

export function AppModal({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  contentClassName,
}: AppModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <Dialog.Portal>
        <Dialog.Backdrop
          className={cn(
            "fixed inset-0 z-50 bg-black/40 backdrop-blur-sm",
            "transition-opacity duration-200 ease-out motion-reduce:transition-none",
            "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0 data-[open]:opacity-100"
          )}
        />
        <Dialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[min(100%-2rem,24rem)] -translate-x-1/2 -translate-y-1/2",
            "rounded-[var(--radius-md)] border border-black/[.08] bg-popover p-6 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.08)] outline-none dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
            "origin-center transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity motion-reduce:duration-200",
            "data-[starting-style]:scale-[0.96] data-[starting-style]:opacity-0",
            "data-[ending-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[ending-style]:ease-out",
            contentClassName
          )}
        >
          <Dialog.Title className="text-lg font-semibold tracking-tight">{title}</Dialog.Title>
          {description != null && description !== false ? (
            <Dialog.Description className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {description}
            </Dialog.Description>
          ) : null}
          <div className={description != null && description !== false ? "mt-6" : "mt-4"}>{children}</div>
          {footer ? <div className="mt-6 flex justify-end gap-3 pt-2">{footer}</div> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
