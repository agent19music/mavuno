"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "@phosphor-icons/react";
import { Tooltip } from "@/components/ui/tooltip-card";

export default function Home() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("mavuno-theme", isDark ? "dark" : "light");
    } catch {
      /* ignore */
    }
  }, [isDark]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-background font-sans">
      <main className="flex w-full max-w-3xl flex-1 flex-col items-center justify-between bg-surface px-6 py-16 sm:items-start sm:px-16 sm:py-32">
        <div className="flex w-full flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <div className="flex w-full max-w-full items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
                Mavuno
              </h1>
              <Image
                src="/assets/mavuno-logo-light-nobg.webp"
                alt="Mavuno logo"
                width={44}
                height={44}
                className="block shrink-0 dark:hidden"
                priority
              />
              <Image
                src="/assets/mavuno-logo-dark-nobg.webp"
                alt="Mavuno logo"
                width={44}
                height={44}
                className="hidden shrink-0 dark:block"
                priority
              />
            </div>
            <button
              type="button"
              onClick={() => setIsDark((v) => !v)}
              aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-black/[.08] text-zinc-700 outline-none ring-foreground/60 transition-colors duration-200 ease-out hover:bg-hover-surface focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/[.08] dark:text-zinc-200 dark:hover:bg-hover-surface sm:size-10"
            >
              {isDark ? <Sun size={20} weight="regular" /> : <Moon size={20} weight="regular" />}
            </button>
          </div>
          <p className="max-w-md text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            Full Stack Developer Technical Assessment
            <br />
            Smart Season Field Monitoring System
            <br />
            Hire{" "}
            <Tooltip
              content={
                <Image
                  src="/assets/portfolio.webp"
                  alt="Sean portfolio preview"
                  width={1385}
                  height={1322}
                  className="rounded-sm"
                  unoptimized
                />
              }
            >
              <a
                href="https://sean.uzskicorp.agency"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4 text-zinc-950 outline-none ring-foreground/60 focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:text-zinc-50"
              >
                me
              </a>
            </Tooltip>{" "}
            please.
          </p>
        </div>
        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <Link
            className="flex h-12 w-full items-center justify-center rounded-full bg-foreground px-5 text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc] md:w-[158px]"
            href="/login"
          >
            Login 
          </Link>
        
        </div>
      </main>
    </div>
  );
}
