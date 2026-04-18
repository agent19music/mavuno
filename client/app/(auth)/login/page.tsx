import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-black/[.08] bg-card p-8 dark:border-white/[.08]">
          <p className="text-sm text-[var(--foreground-subtle)]">Loading…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
