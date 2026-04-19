"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { MagnifyingGlass, Moon, SignOut, Sun } from "@phosphor-icons/react/dist/ssr";
import { Popover } from "@base-ui/react/popover";
import { NotificationsBell } from "@/components/app-shell/NotificationsBell";
import { SearchOverlay } from "@/components/app-shell/SearchOverlay";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/lib/auth-context";
import { displayUserName } from "@/types/models";

export function Topbar() {
  const { user, logout } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("mavuno-theme", isDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [isDark]);

  // Global Cmd/Ctrl+K shortcut. Don't intercept while typing into inputs.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      const editable = target?.isContentEditable;
      if (!searchOpen && (tag === "INPUT" || tag === "TEXTAREA" || editable)) return;
      event.preventDefault();
      setSearchOpen((v) => !v);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [searchOpen]);

  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);

  const home = user?.role === "agent" ? "/agent/dashboard" : "/admin/dashboard";
  const displayName = user ? displayUserName(user) : "Guest";

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[.08] bg-surface/90 px-4 backdrop-blur dark:border-white/[.08] md:px-6">
        <div className="flex items-center gap-3">
          <Link href={home} className="flex items-center gap-2 md:hidden">
            <Image
              src="/assets/mavuno-logo-light-nobg.webp"
              alt="Mavuno logo"
              width={28}
              height={28}
              className="block dark:hidden"
              priority
            />
            <Image
              src="/assets/mavuno-logo-dark-nobg.webp"
              alt="Mavuno logo"
              width={28}
              height={28}
              className="hidden dark:block"
              priority
            />
            <span className="text-sm font-semibold tracking-tight text-[var(--brand-olive)] dark:text-[var(--brand-sand)]">
              Mavuno
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-hover-surface dark:border-white/[.08] md:hidden"
            aria-label="Open search"
          >
            <MagnifyingGlass size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-3 rounded-full border border-black/[.08] py-2 pl-4 pr-2 text-sm text-zinc-500 transition-colors hover:bg-hover-surface dark:border-white/[.08] dark:text-zinc-400 md:inline-flex"
            aria-label="Open search"
          >
            <MagnifyingGlass size={16} />
            <span className="pr-2">Search fields, agents, updates</span>
            <kbd
              className="ml-1 inline-flex h-6 items-center gap-0.5 rounded-full border border-black/[.08] bg-inset-surface px-2 font-mono text-[10px] text-zinc-500 dark:border-white/[.08] dark:text-zinc-400"
              aria-hidden
            >
              {isMac ? "⌘" : "Ctrl"}K
            </kbd>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <NotificationsBell />

          <Popover.Root>
            <Popover.Trigger
              className="inline-flex rounded-full outline-none ring-foreground/60 ring-offset-2 ring-offset-background focus-visible:ring-2"
              aria-label="Account menu"
            >
              <Avatar name={displayName} className="inline-flex" />
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Positioner sideOffset={8} align="end">
                <Popover.Popup className="z-50 w-72 origin-[var(--transform-origin)] rounded-[var(--radius-md)] border border-black/[.08] bg-popover p-2 text-foreground shadow-[0_16px_48px_rgba(0,0,0,0.08)] outline-none dark:border-white/[.08] dark:shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
                  <div className="border-b border-black/[.08] px-3 py-3 dark:border-white/[.08]">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                    {user && (
                      <div className="mt-2">
                        <Badge tone="neutral">{user.role === "admin" ? "Admin" : "Field agent"}</Badge>
                      </div>
                    )}
                  </div>
                  <div className="p-1">
                    <button
                      type="button"
                      onClick={() => setIsDark((v) => !v)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-hover-surface"
                    >
                      {isDark ? <Sun size={18} /> : <Moon size={18} />}
                      {isDark ? "Light mode" : "Dark mode"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void logout()}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-zinc-700 transition-colors hover:bg-hover-surface dark:text-zinc-200"
                    >
                      <SignOut size={18} />
                      Sign out
                    </button>
                  </div>
                </Popover.Popup>
              </Popover.Positioner>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
