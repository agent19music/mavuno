"use client";

import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { Bell } from "@phosphor-icons/react/dist/ssr";
import { useAuth } from "@/lib/auth-context";
import { useNotifications } from "@/lib/useNotifications";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types/models";

function notificationHref(n: AppNotification, role: "admin" | "agent"): string | null {
  if (n.kind === "field_merged_away" && n.target_field_id) {
    return role === "admin" ? `/admin/fields/${n.target_field_id}` : `/agent/fields/${n.target_field_id}`;
  }
  return null;
}

export function NotificationsBell() {
  const { user } = useAuth();
  const { items, unreadCount, markRead } = useNotifications();
  const role = user?.role ?? "agent";

  return (
    <Popover.Root>
      <Popover.Trigger
        className="relative inline-flex size-11 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-hover-surface dark:border-white/[.08] md:size-10"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span
            className="absolute right-2 top-2 size-2 rounded-full bg-[var(--accent)] ring-2 ring-surface"
            aria-hidden
          />
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="end">
          <Popover.Popup
            className={cn(
              "z-50 w-[min(100vw-2rem,22rem)] origin-[var(--transform-origin)]",
              "rounded-[var(--radius-md)] border border-black/[.08] bg-popover text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.08)] outline-none dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
              "transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-opacity",
              "data-[starting-style]:scale-[0.97] data-[starting-style]:opacity-0",
              "data-[ending-style]:scale-[0.97] data-[ending-style]:opacity-0 data-[ending-style]:duration-150 data-[ending-style]:ease-out"
            )}
          >
            <div className="flex items-center justify-between border-b border-black/[.08] px-3 py-2 dark:border-white/[.08]">
              <p className="text-sm font-medium">Notifications</p>
              <button
                type="button"
                className="text-xs font-medium text-foreground transition-opacity hover:opacity-70"
                onClick={() => void markRead()}
              >
                Mark all read
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto p-1">
              {items.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">No notifications</li>
              ) : (
                items.map((n) => {
                  const href = notificationHref(n, role);
                  const inner = (
                    <div className="rounded-lg px-3 py-2 text-left transition-colors hover:bg-hover-surface">
                      <p className="text-sm font-medium text-foreground">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{n.body}</p>
                      ) : null}
                      <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                  );
                  return (
                    <li key={n.id}>
                      {href ? (
                        <Link
                          href={href}
                          className="block outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                          onClick={() => void markRead([n.id])}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          className="block w-full outline-none ring-foreground/60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                          onClick={() => void markRead([n.id])}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })
              )}
            </ul>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
