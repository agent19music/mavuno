import { Dog } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col justify-center bg-surface px-6 py-16 sm:px-16 sm:py-32">
        <div className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left">
          <div className="flex w-full flex-row flex-wrap items-end justify-center gap-4 sm:justify-start sm:gap-6">
            <p className="text-[clamp(5rem,22vw,10rem)] font-semibold leading-none tracking-tight text-foreground">
              404
            </p>
            <Image
              src="/assets/farmer-404.webp"
              alt=""
              width={300}
              height={300}
              className="shrink-0 object-contain"
              priority
            />
          </div>
          <h1 className="max-w-md text-2xl font-semibold leading-9 tracking-tight text-foreground sm:text-3xl sm:leading-10">
            Uh oh, where did bingo go?
          </h1>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            This page doesn&apos;t exist.
          </p>
          <Link
            href="/"
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-base font-medium text-background outline-none transition-colors duration-200 ease-out hover:bg-[#383838] focus-visible:ring-2 focus-visible:ring-foreground/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-[#ccc] sm:w-auto sm:min-w-[158px]"
          >
            Find bingo 
            <Dog size={20} className="ml-2" weight="regular" />
          </Link>
        </div>
      </main>
    </div>
  );
}
