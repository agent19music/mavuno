import * as React from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visual size of the box in px. Defaults to 16. */
  boxSize?: number;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, boxSize = 16, disabled, ...props }, ref) => {
    return (
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          disabled && "opacity-50",
          className
        )}
        style={{ width: boxSize, height: boxSize }}
      >
        <input
          ref={ref}
          type="checkbox"
          disabled={disabled}
          className="peer absolute inset-0 m-0 h-full w-full cursor-pointer appearance-none rounded-[4px] border border-[var(--border-strong)] bg-card outline-none transition-colors duration-[200ms] ease-[var(--ease-out)] hover:border-foreground/40 checked:border-foreground checked:bg-foreground focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:hover:border-[var(--border-strong)]"
          {...props}
        />
        <Check
          weight="bold"
          className="pointer-events-none absolute text-background opacity-0 transition-opacity duration-[160ms] ease-[var(--ease-out)] peer-checked:opacity-100"
          style={{ width: boxSize - 4, height: boxSize - 4 }}
        />
      </span>
    );
  }
);

Checkbox.displayName = "Checkbox";
