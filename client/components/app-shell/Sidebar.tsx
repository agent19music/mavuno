"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { navItemsForRole } from "@/components/app-shell/nav-items";
import { useAuth } from "@/lib/auth-context";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const appNavItems = navItemsForRole(user?.role ?? null);
  const home = user?.role === "agent" ? "/agent/dashboard" : "/admin/dashboard";

  return (
    <aside className="hidden w-72 shrink-0 border-r border-black/[.08] bg-surface px-6 py-8 dark:border-white/[.08] md:block">
      <Link href={home} className="mb-8 flex items-center gap-3 px-2">
        <Image
          src="/assets/mavuno-logo-light-nobg.webp"
          alt="Mavuno logo"
          width={40}
          height={40}
          className="block dark:hidden"
          priority
        />
        <Image
          src="/assets/mavuno-logo-dark-nobg.webp"
          alt="Mavuno logo"
          width={40}
          height={40}
          className="hidden dark:block"
          priority
        />
        <span className="text-lg font-semibold tracking-tight text-[var(--brand-olive)] dark:text-[var(--brand-sand)]">
          Mavuno Farm
        </span>
      </Link>

      <nav className="flex flex-col gap-2">
        {appNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-full px-4 text-sm font-medium transition-colors duration-[200ms] ease-[var(--ease-out)]",
                isActive
                  ? "bg-foreground text-background dark:bg-zinc-100 dark:text-zinc-900"
                  : "hover:bg-hover-surface"
              )}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
