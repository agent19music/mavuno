import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-12 w-full rounded-lg border border-black/[.08] bg-inset-surface px-4 text-base text-foreground outline-none transition-colors duration-[200ms] ease-[var(--ease-out)]",
          "placeholder:text-zinc-400 dark:border-white/[.08]",
          "focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = "Input";
