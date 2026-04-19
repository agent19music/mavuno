"use client";

import * as React from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/utils";

export type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /** Override the toggle's accessible labels (e.g. for i18n). */
  showLabel?: string;
  hideLabel?: string;
};

/**
 * A password field with a built-in show/hide toggle.
 * Mirrors the styling/spacing of <Input>; reserves room on the right for the eye button.
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, showLabel = "Show password", hideLabel = "Hide password", ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          type={visible ? "text" : "password"}
          className={cn("pr-12", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          aria-pressed={visible}
          tabIndex={-1}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-zinc-500 transition-colors duration-[160ms] ease-[var(--ease-out)] hover:text-foreground focus-visible:text-foreground focus-visible:outline-none"
        >
          {visible ? (
            <EyeSlash className="h-4 w-4" weight="regular" />
          ) : (
            <Eye className="h-4 w-4" weight="regular" />
          )}
        </button>
      </div>
    );
  }
);

PasswordInput.displayName = "PasswordInput";
