import { users } from "@/lib/mock-data";
import { AgentList } from "@/components/agents/AgentList";

export default function AgentsPage() {
  const agents = users.filter((user) => user.role === "agent");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Agents</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Field agents and assignment coverage.</p>
      </div>
      <AgentList agents={agents} />
    </div>
  );
}
