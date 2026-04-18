"use client";

import { useEffect, useRef } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react/dist/ssr";

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    inputRef.current?.focus();

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 bg-background/90 px-4 py-6 backdrop-blur md:flex md:items-start md:justify-center md:px-6 md:py-10"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onMouseDown={(event) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="w-full rounded-xl border border-black/[.08] bg-popover p-4 shadow-[0_16px_48px_rgba(0,0,0,0.08)] dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)] md:max-w-2xl md:p-6"
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Search</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-hover-surface dark:border-white/[.08] md:size-10"
            aria-label="Close search"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex h-12 items-center gap-2 rounded-lg border border-black/[.08] bg-inset-surface px-4 text-sm text-zinc-500 dark:border-white/[.08] dark:text-zinc-400">
          <MagnifyingGlass size={16} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search fields, agents, updates"
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-zinc-400"
          />
        </div>
        <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Search is coming soon.</p>
      </div>
    </div>
  );
}
