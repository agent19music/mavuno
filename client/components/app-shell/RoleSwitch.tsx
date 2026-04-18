"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function RoleSwitch() {
  const [role, setRole] = useState<"admin" | "agent">("admin");

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-black/[.08] p-1 dark:border-white/[.145]">
      <Button
        variant={role === "admin" ? "primary" : "ghost"}
        className="h-9 px-4 text-sm"
        onClick={() => setRole("admin")}
      >
        Admin
      </Button>
      <Button
        variant={role === "agent" ? "primary" : "ghost"}
        className="h-9 px-4 text-sm"
        onClick={() => setRole("agent")}
      >
        Agent
      </Button>
    </div>
  );
}
