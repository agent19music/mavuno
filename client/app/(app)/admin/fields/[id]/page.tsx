"use client";

import { useParams } from "next/navigation";
import { FieldDetailPageContent } from "@/components/fields/FieldDetailPageContent";

export default function AdminFieldDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  if (Number.isNaN(id)) {
    return <p className="text-sm text-[var(--foreground-subtle)]">Invalid field.</p>;
  }
  return <FieldDetailPageContent fieldId={id} isAdmin listHref="/admin/fields" />;
}
