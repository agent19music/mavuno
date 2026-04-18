import Link from "next/link";
import type { User } from "@/types/models";
import { getFieldsForAgent } from "@/lib/mock-helpers";
import { Avatar } from "@/components/ui/Avatar";
import { Card, CardDescription, CardTitle } from "@/components/ui/Card";

export function AgentCard({ agent }: { agent: User }) {
  const assigned = getFieldsForAgent(agent.id).length;

  return (
    <Link href={`/agents/${agent.id}`} className="block">
      <Card className="transition-all duration-[200ms] ease-[var(--ease-out)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
        <div className="mb-4 flex items-center gap-3">
          <Avatar name={agent.fullName} />
          <div>
            <CardTitle className="text-base">{agent.fullName}</CardTitle>
            <CardDescription>{agent.role}</CardDescription>
          </div>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{assigned} assigned fields</p>
      </Card>
    </Link>
  );
}
