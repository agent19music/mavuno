"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types/models";

function safeNext(role: Role, next: string | null): string {
  if (next?.startsWith("/admin") && role === "admin") return next;
  if (next?.startsWith("/agent") && role === "agent") return next;
  return role === "agent" ? "/agent/dashboard" : "/admin/dashboard";
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to Mavuno with your work email.">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setPending(true);
          void (async () => {
            try {
              const u = await login(email, password);
              const dest = safeNext(u.role, searchParams.get("next"));
              router.push(dest);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Sign in failed");
            } finally {
              setPending(false);
            }
          })();
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@farm.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <PasswordInput
            id="password"
            placeholder="••••••••"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthCard>
  );
}
