import type { FieldUpdate } from "@/types/models";
import { Card, CardTitle } from "@/components/ui/Card";
import { UpdateItem } from "@/components/updates/UpdateItem";

export function ActivityFeed({
  updates,
  title = "Recent updates",
}: {
  updates: FieldUpdate[];
  title?: string;
}) {
  return (
    <Card>
      <CardTitle className="mb-4">{title}</CardTitle>
      <div className="space-y-3">
        {updates.map((update) => (
          <UpdateItem key={update.id} update={update} />
        ))}
      </div>
    </Card>
  );
}
