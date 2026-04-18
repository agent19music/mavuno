import type { User } from "@/types/models";
import { AgentCard } from "@/components/agents/AgentCard";

export function AgentList({ agents }: { agents: User[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {agents.map((agent, index) => (
        <div
          key={agent.id}
          className="stagger-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <AgentCard agent={agent} />
        </div>
      ))}
    </div>
  );
}
