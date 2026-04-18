import * as React from "react";
import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "active" | "risk";

const toneClasses: Record<BadgeTone, string> = {
  neutral: "bg-inset-surface text-zinc-700 dark:text-zinc-300",
  active:
    "bg-[var(--brand-sand)] text-[var(--brand-olive)] dark:bg-[var(--brand-olive)] dark:text-[var(--brand-cream)]",
  risk:
    "bg-zinc-900 text-[var(--brand-cream)] dark:bg-[var(--brand-sand)] dark:text-[var(--brand-olive)]",
};

export function Badge({
  className,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        toneClasses[tone],
        className
      )}
      {...props}
    />
  );
}
