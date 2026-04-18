import Link from "next/link";
import type { ApiUser } from "@/types/models";
import { displayUserName } from "@/types/models";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export function AgentCard({
  agent,
  assignedCount,
  basePath,
}: {
  agent: ApiUser;
  assignedCount: number;
  basePath: string;
}) {
  const name = displayUserName(agent);
  const href = `${basePath.replace(/\/$/, "")}/${agent.id}`;

  return (
    <Link href={href} className="block">
      <Card className="transition-transform duration-[200ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)] dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={name} />
          <div>
            <CardTitle className="text-base">{name}</CardTitle>
            <CardDescription>Field agent</CardDescription>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {assignedCount} assigned field{assignedCount === 1 ? "" : "s"}
        </p>
      </Card>
    </Link>
  );
}
