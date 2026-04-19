"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "agent") {
      router.replace("/agent/dashboard");
    }
  }, [user, isLoading, router]);

  if (!isLoading && user?.role === "agent") {
    return (
      <p className="p-8 text-sm text-[var(--foreground-subtle)]">Redirecting…</p>
    );
  }

  return <>{children}</>;
}
