import { fields } from "@/lib/mock-data";
import { FieldList } from "@/components/fields/FieldList";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function FieldsPage() {
  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Fields</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 sm:text-base">
          Browse all monitored farm fields.
        </p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <Input placeholder="Search fields..." className="col-span-2 md:col-span-2" />
        <Button variant="secondary">Stage</Button>
        <Button variant="secondary">Status</Button>
      </section>

      <FieldList fields={fields} />
    </div>
  );
}
