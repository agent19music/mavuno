import * as React from "react";
import { cn } from "@/lib/utils";

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      aria-hidden
      className={cn(
        "shrink-0 bg-black/[.08] dark:bg-white/[.145]",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className
      )}
    />
  );
}
