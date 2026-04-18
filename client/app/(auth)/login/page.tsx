"use client";

import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function LoginPage() {
  const router = useRouter();
  return (
    <>
      <AuthCard title="Welcome back" subtitle="Sign in to explore the Mavuno UI shell.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/dashboard");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@farm.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full">
            Sign in
          </Button>
          <Button type="button" variant="secondary" className="w-full">
            Continue with Google
          </Button>
        </form>
      </AuthCard>
      <AuthFooter text="Don't have an account?" href="/signup" hrefLabel="Create one" />
    </>
  );
}
