import * as React from "react";
import { cn } from "@/lib/utils";

export function Avatar({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-full border border-black/[.08] bg-inset-surface text-sm font-medium text-zinc-700 dark:border-white/[.08] dark:text-zinc-200",
        className
      )}
    >
      {initials}
    </div>
  );
}
