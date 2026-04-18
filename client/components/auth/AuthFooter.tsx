import Link from "next/link";

export function AuthFooter({
  text,
  href,
  hrefLabel,
}: {
  text: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <p className="mt-6 text-center text-sm text-zinc-600 dark:text-zinc-400">
      {text}{" "}
      <Link href={href} className="font-medium text-zinc-950 dark:text-zinc-50">
        {hrefLabel}
      </Link>
    </p>
  );
}
