"use client";

import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthFooter } from "@/components/auth/AuthFooter";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";

export default function SignupPage() {
  const router = useRouter();
  return (
    <>
      <AuthCard title="Create account" subtitle="UI-only onboarding for exploration.">
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            router.push("/dashboard");
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" type="text" placeholder="Jane Doe" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@farm.com" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" placeholder="••••••••" required />
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </AuthCard>
      <AuthFooter text="Already have an account?" href="/login" hrefLabel="Sign in" />
    </>
  );
}
