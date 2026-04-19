"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading || user) return;
    const next = pathname ? `?next=${encodeURIComponent(pathname)}` : "";
    router.replace(`/login${next}`);
  }, [user, isLoading, pathname, router]);

  if (isLoading || !user) {
    return <p className="p-8 text-sm text-[var(--foreground-subtle)]">Loading…</p>;
  }

  return <>{children}</>;
}
