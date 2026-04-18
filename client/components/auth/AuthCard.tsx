import type { ReactNode } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";

export function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-6 sm:p-8">
      <div className="mb-5">
        <Image
          src="/assets/mavuno-logo-light-nobg.webp"
          alt="Mavuno logo"
          width={54}
          height={54}
          className="block dark:hidden"
        />
        <Image
          src="/assets/mavuno-logo-dark-nobg.webp"
          alt="Mavuno logo"
          width={54}
          height={54}
          className="hidden dark:block"
        />
      </div>
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
