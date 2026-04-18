import { Card, CardTitle } from "@/components/ui/Card";
import { ActivityFeed } from "@/components/updates/ActivityFeed";
import { FieldsByStageChart } from "@/components/charts/FieldsByStageChart";
import { UpdatesTrendChart } from "@/components/charts/UpdatesTrendChart";
import { getDashboardStats, getRecentUpdates } from "@/lib/mock-helpers";

export default function DashboardPage() {
  const stats = getDashboardStats();
  const updates = getRecentUpdates(5);

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Dashboard</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Farm operations overview with muted analytics.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card><CardTitle className="text-sm">Fields</CardTitle><p className="mt-2 text-3xl font-semibold">{stats.totalFields}</p></Card>
        <Card><CardTitle className="text-sm">Agents</CardTitle><p className="mt-2 text-3xl font-semibold">{stats.totalAgents}</p></Card>
        <Card><CardTitle className="text-sm">Updates (week)</CardTitle><p className="mt-2 text-3xl font-semibold">{stats.updatesThisWeek}</p></Card>
        <Card><CardTitle className="text-sm">At risk</CardTitle><p className="mt-2 text-3xl font-semibold">{stats.atRiskFields}</p></Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardTitle className="mb-4">Fields by stage</CardTitle>
          <FieldsByStageChart />
        </Card>
        <Card>
          <CardTitle className="mb-4">Updates trend</CardTitle>
          <UpdatesTrendChart />
        </Card>
      </section>

      <ActivityFeed updates={updates} />
    </div>
  );
}
