"use client";

import { useEffect, useState } from "react";
import { Bell, MagnifyingGlass, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { RoleSwitch } from "@/components/app-shell/RoleSwitch";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return (
      document.documentElement.classList.contains("dark") ||
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  return (
    <header className="sticky top-0 z-20 flex h-18 items-center justify-between border-b border-black/[.08] bg-white/90 px-6 backdrop-blur dark:border-white/[.145] dark:bg-black/90">
      <div className="flex items-center gap-3 rounded-full border border-black/[.08] px-4 py-2 text-sm text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
        <MagnifyingGlass size={16} />
        Search fields, agents, updates
      </div>

      <div className="flex items-center gap-3">
        <RoleSwitch />
        <button
          type="button"
          onClick={() => setIsDark((value) => !value)}
          className="inline-flex size-10 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button className="inline-flex size-10 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a]">
          <Bell size={18} />
        </button>
        <Avatar name="Mavuno Admin" />
      </div>
    </header>
  );
}
