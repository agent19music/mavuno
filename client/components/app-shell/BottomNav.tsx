"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItemsForRole } from "@/components/app-shell/nav-items";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const appNavItems = navItemsForRole(user?.role ?? null);
  const cols = appNavItems.length;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[.08] bg-surface/90 pb-[env(safe-area-inset-bottom)] backdrop-blur dark:border-white/[.08] md:hidden">
      <ul
        className={cn(
          "grid min-h-14",
          cols === 3 && "grid-cols-3",
          cols === 4 && "grid-cols-4"
        )}
      >
        {appNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-2 transition-colors",
                  isActive
                    ? "font-medium text-foreground"
                    : "text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-100"
                )}
              >
                <Icon size={18} />
                <span className="text-xs">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
