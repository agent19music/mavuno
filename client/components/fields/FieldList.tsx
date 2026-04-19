import type { Field } from "@/types/models";
import { FieldCard } from "@/components/fields/FieldCard";

export function FieldList({ fields, basePath }: { fields: Field[]; basePath: string }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {fields.map((field, index) => (
        <div
          key={field.id}
          className="stagger-in"
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <FieldCard field={field} basePath={basePath} />
        </div>
      ))}
    </div>
  );
}
