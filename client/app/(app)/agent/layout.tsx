"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (user?.role === "admin") {
      router.replace("/admin/dashboard");
    }
  }, [user, isLoading, router]);

  if (!isLoading && user?.role === "admin") {
    return (
      <p className="p-8 text-sm text-[var(--foreground-subtle)]">Redirecting…</p>
    );
  }

  return <>{children}</>;
}
