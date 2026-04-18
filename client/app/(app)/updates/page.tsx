import { getRecentUpdates } from "@/lib/mock-helpers";
import { ActivityFeed } from "@/components/updates/ActivityFeed";

export default function UpdatesPage() {
  const updates = getRecentUpdates(20);
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Updates</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Chronological field update feed.
        </p>
      </div>
      <ActivityFeed updates={updates} title="All updates" />
    </div>
  );
}
