"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Farm,
  FileText,
  House,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/fields", label: "Fields", icon: Farm },
  { href: "/agents", label: "Agents", icon: UserCircle },
  { href: "/updates", label: "Updates", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 shrink-0 border-r border-black/[.08] bg-zinc-50/50 px-6 py-8 dark:border-white/[.145] dark:bg-black md:block">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3 px-2">
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
        {navItems.map((item) => {
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
                  : "hover:bg-black/[.04] dark:hover:bg-[#1a1a1a]"
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
