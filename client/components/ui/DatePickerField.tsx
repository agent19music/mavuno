"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { Popover } from "@base-ui/react/popover";
import { CalendarBlank } from "@phosphor-icons/react";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/Label";
import { cn } from "@/lib/utils";

type DatePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (isoDate: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function parseLocalYmd(value: string): Date | undefined {
  if (!value) return undefined;
  const d = parse(value, "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
}

export function DatePickerField({
  id,
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder = "Pick a date",
}: DatePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const selected = parseLocalYmd(value);
  const labelText = selected ? format(selected, "MMM d, yyyy") : placeholder;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {required ? (
        <input
          type="hidden"
          name={`${id}-value`}
          value={value}
          required
          aria-hidden
          tabIndex={-1}
        />
      ) : null}
      <Popover.Root open={open} onOpenChange={(next) => setOpen(next)} modal={false}>
        <Popover.Trigger
          type="button"
          id={id}
          disabled={disabled}
          className={cn(
            "flex h-12 w-full items-center justify-between gap-3 rounded-lg border border-[var(--border-strong)] bg-inset-surface px-4 text-left text-base text-foreground outline-none transition-colors duration-[200ms] ease-[var(--ease-out)]",
            "ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            "disabled:pointer-events-none disabled:opacity-50",
            !selected && "text-zinc-500 dark:text-zinc-400",
          )}
        >
          <span className="min-w-0 truncate">{labelText}</span>
          <CalendarBlank className="size-5 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner side="bottom" sideOffset={8} align="start" className="z-[200]">
            <Popover.Popup
              data-slot="popover-content"
              className="z-[200] origin-[var(--transform-origin)] rounded-[var(--radius-md)] border border-black/[.08] bg-popover p-2 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.08)] outline-none dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
            >
              <Calendar
                mode="single"
                selected={selected}
                defaultMonth={selected ?? new Date()}
                onSelect={(d) => {
                  if (d) {
                    onChange(format(d, "yyyy-MM-dd"));
                    setOpen(false);
                  }
                }}
                autoFocus
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
