import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";

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
          // Emil-inspired press feedback, only for direct interaction.
          "active:scale-[0.97] active:duration-[160ms]",
          variantClasses[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";
