import type { ApiUser } from "@/types/models";
import { AgentCard } from "@/components/agents/AgentCard";

export function AgentList({
  agents,
  assignedByAgentId,
  basePath,
}: {
  agents: ApiUser[];
  assignedByAgentId: Record<number, number>;
  basePath: string;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent, index) => (
        <div
          key={agent.id}
          className="stagger-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <AgentCard
            agent={agent}
            assignedCount={assignedByAgentId[agent.id] ?? 0}
            basePath={basePath}
          />
        </div>
      ))}
    </div>
  );
}
