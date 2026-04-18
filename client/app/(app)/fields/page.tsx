import { fields } from "@/lib/mock-data";
import { FieldList } from "@/components/fields/FieldList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function FieldsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Fields</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">Browse all monitored farm fields.</p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <Input placeholder="Search fields..." className="md:col-span-2" />
        <Button variant="secondary">Stage</Button>
        <Button variant="secondary">Status</Button>
      </section>

      <FieldList fields={fields} />
    </div>
  );
}
