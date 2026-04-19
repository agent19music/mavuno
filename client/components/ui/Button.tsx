import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-foreground text-background hover:bg-[#383838] dark:hover:bg-[#ccc] border border-transparent",
  secondary:
    "border border-solid border-black/[.08] hover:border-transparent hover:bg-hover-surface dark:border-white/[.08]",
  ghost:
    "border border-transparent text-foreground hover:bg-hover-surface",
  // Color fills on hover use plain `ease` per Emil's decision tree (reserve custom
  // `--ease-out` curves for enter/exit). Duration inherits the base 200ms — inside
  // Emil's 150-250ms UI range. Tailwind v4 gates `hover:` behind `@media (hover: hover)`
  // so touch taps don't leave the button stuck in the filled state.
  destructive:
    "border border-solid border-brand-red text-brand-red dark:text-white bg-transparent ease-[ease] hover:bg-brand-red hover:text-white hover:border-brand-red focus-visible:ring-brand-red/50",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex h-12 items-center justify-center gap-2 rounded-full px-5 text-base font-medium transition-colors duration-[200ms] ease-[var(--ease-out)]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          "disabled:pointer-events-none disabled:opacity-50",
          // Emil-inspired press feedback (DESIGN.md: no hover motion on buttons).
          "motion-safe:active:scale-[0.97] motion-reduce:active:scale-100 active:duration-[160ms]",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
