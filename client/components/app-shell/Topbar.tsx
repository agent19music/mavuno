"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bell, MagnifyingGlass, Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import { RoleSwitch } from "@/components/app-shell/RoleSwitch";
import { SearchOverlay } from "@/components/app-shell/SearchOverlay";
import { Avatar } from "@/components/ui/Avatar";

export function Topbar() {
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("mavuno-theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  return (
    <>
      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[.08] bg-surface/90 px-4 backdrop-blur dark:border-white/[.08] md:px-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
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
            className="hidden items-center gap-3 rounded-full border border-black/[.08] px-4 py-2 text-sm text-zinc-500 transition-colors hover:bg-hover-surface dark:border-white/[.08] dark:text-zinc-400 md:inline-flex"
          >
            <MagnifyingGlass size={16} />
            Search fields, agents, updates
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden sm:block">
            <RoleSwitch />
          </div>
          <button
            type="button"
            onClick={() => setIsDark((value) => !value)}
            className="inline-flex size-11 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-hover-surface dark:border-white/[.08] md:size-10"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-black/[.08] transition-colors hover:bg-hover-surface dark:border-white/[.08] md:size-10"
            aria-label="Notifications"
          >
            <Bell size={18} />
          </button>
          <Avatar name="Mavuno Admin" className="hidden sm:inline-flex" />
        </div>
      </header>
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
