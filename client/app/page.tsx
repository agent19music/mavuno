"use client";

import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between bg-surface px-6 py-16 sm:items-start sm:px-16 sm:py-32">
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
              Mavuno
            </h1>
            <Image
              src="/assets/mavuno-logo-light-nobg.webp"
              alt="Mavuno logo"
              width={44}
              height={44}
              className="block dark:hidden"
              priority
            />
            <Image
              src="/assets/mavuno-logo-dark-nobg.webp"
              alt="Mavuno logo"
              width={44}
              height={44}
              className="hidden dark:block"
              priority
            />
          </div>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Full Stack Developer Technical Assessment
            <br />
            SmartSeason Field Monitoring System
            <br />
            Hire{" "}
            <a
              href="https://sean.uzskicorp.agency"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-4 text-zinc-950 dark:text-zinc-50"
            >
              me
            </a>
            {" "}please.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/login"
          >
            Login UI
          </Link>
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-hover-surface dark:border-white/[.08] md:w-[158px]"
            href="/admin/dashboard"
          >
            Open App
          </Link>
        </div>
      </main>
    </div>
  );
}
