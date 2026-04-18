import { getRecentUpdates } from "@/lib/mock-helpers";
import { ActivityFeed } from "@/components/updates/ActivityFeed";

export default function UpdatesPage() {
  const updates = getRecentUpdates(20);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Updates</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Chronological field update feed.</p>
      </div>
      <ActivityFeed updates={updates} title="All updates" />
    </div>
  );
}
