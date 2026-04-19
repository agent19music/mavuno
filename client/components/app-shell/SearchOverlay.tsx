"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CornersOut,
  FileText,
  MagnifyingGlass,
  Tractor,
  UserCircle,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { displayUserName } from "@/types/models";
import type { ApiUser, Field, FieldUpdate } from "@/types/models";

type SearchOverlayProps = {
  open: boolean;
  onClose: () => void;
};

type ResultKind = "field" | "agent" | "update";

type SearchResult = {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  href: string;
  score: number;
  /** Lowercased haystack used to compute highlight ranges in the title/subtitle. */
  matchSource: { title: string; subtitle: string };
};

type GroupedResults = {
  fields: SearchResult[];
  agents: SearchResult[];
  updates: SearchResult[];
};

const STAGE_LABEL: Record<string, string> = {
  planted: "Planted",
  growing: "Growing",
  ready: "Ready",
  harvested: "Harvested",
};

/** Module-level cache so re-opening the overlay feels instant. */
let dataCache:
  | {
      at: number;
      fields: Field[];
      agents: ApiUser[];
      updates: FieldUpdate[];
    }
  | null = null;

const CACHE_TTL_MS = 30_000;

function scoreMatch(haystack: string, needle: string, weight = 1): number {
  if (!needle) return 0;
  const idx = haystack.indexOf(needle);
  if (idx < 0) return 0;
  // Exact prefix beats word boundary beats anywhere.
  let base = 1;
  if (idx === 0) base = 4;
  else if (haystack[idx - 1] === " ") base = 3;
  else base = 2;
  return base * weight;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.round(hr / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function buildResults(
  query: string,
  fields: Field[],
  agents: ApiUser[],
  updates: FieldUpdate[],
  fieldHref: (id: number) => string
): GroupedResults {
  const q = query.trim().toLowerCase();
  const empty: GroupedResults = { fields: [], agents: [], updates: [] };
  if (!q) return empty;

  const fieldResults: SearchResult[] = [];
  for (const f of fields) {
    const name = f.name.toLowerCase();
    const crop = f.crop_type.toLowerCase();
    const notes = (f.notes ?? "").toLowerCase();
    const agentNames =
      f.assigned_agents?.map((a) => displayUserName(a).toLowerCase()).join(" ") ?? "";
    const score =
      scoreMatch(name, q, 4) +
      scoreMatch(crop, q, 2) +
      scoreMatch(notes, q, 1) +
      scoreMatch(agentNames, q, 1);
    if (score === 0) continue;
    const stage = STAGE_LABEL[f.current_stage] ?? f.current_stage;
    const subtitle = `${f.crop_type} · ${stage}`;
    fieldResults.push({
      id: `field-${f.id}`,
      kind: "field",
      title: f.name,
      subtitle,
      href: fieldHref(f.id),
      score,
      matchSource: { title: name, subtitle: subtitle.toLowerCase() },
    });
  }

  const agentResults: SearchResult[] = [];
  for (const a of agents) {
    const name = displayUserName(a);
    const nameLc = name.toLowerCase();
    const username = a.username.toLowerCase();
    const email = a.email.toLowerCase();
    const score =
      scoreMatch(nameLc, q, 4) + scoreMatch(username, q, 2) + scoreMatch(email, q, 2);
    if (score === 0) continue;
    agentResults.push({
      id: `agent-${a.id}`,
      kind: "agent",
      title: name,
      subtitle: a.email || a.username,
      href: `/admin/agents`,
      score,
      matchSource: { title: nameLc, subtitle: (a.email || a.username).toLowerCase() },
    });
  }

  const updateResults: SearchResult[] = [];
  for (const u of updates) {
    const fieldName = u.field_name.toLowerCase();
    const notes = (u.notes ?? "").toLowerCase();
    const agentName = displayUserName(u.agent).toLowerCase();
    const score =
      scoreMatch(fieldName, q, 3) + scoreMatch(notes, q, 2) + scoreMatch(agentName, q, 1);
    if (score === 0) continue;
    const subtitle = `${u.field_name} · ${displayUserName(u.agent)} · ${relativeTime(u.timestamp)}`;
    updateResults.push({
      id: `update-${u.id}`,
      kind: "update",
      title: u.notes?.trim() || `${STAGE_LABEL[u.stage] ?? u.stage} update`,
      subtitle,
      href: fieldHref(u.field),
      score,
      matchSource: { title: (u.notes ?? "").toLowerCase(), subtitle: subtitle.toLowerCase() },
    });
  }

  const cmp = (a: SearchResult, b: SearchResult) => b.score - a.score;
  return {
    fields: fieldResults.sort(cmp).slice(0, 6),
    agents: agentResults.sort(cmp).slice(0, 6),
    updates: updateResults.sort(cmp).slice(0, 6),
  };
}

function flatten(grouped: GroupedResults): SearchResult[] {
  return [...grouped.fields, ...grouped.agents, ...grouped.updates];
}

/** Splits text around the (case-insensitive) first match of `query`. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx < 0) return text;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark className="bg-[var(--brand-sand)]/60 text-foreground dark:bg-[var(--brand-olive)]/60 dark:text-[var(--brand-cream)]">
        {match}
      </mark>
      {after}
    </>
  );
}

const ICON_BY_KIND: Record<ResultKind, typeof Tractor> = {
  field: Tractor,
  agent: UserCircle,
  update: FileText,
};

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const { user } = useAuth();
  const role = user?.role ?? "agent";

  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{
    fields: Field[];
    agents: ApiUser[];
    updates: FieldUpdate[];
  }>(() => ({
    fields: dataCache?.fields ?? [],
    agents: dataCache?.agents ?? [],
    updates: dataCache?.updates ?? [],
  }));

  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const fieldHref = useCallback(
    (id: number) => (role === "admin" ? `/admin/fields/${id}` : `/agent/fields/${id}`),
    [role]
  );

  // Reset transient state when overlay closes so the next open feels fresh.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  // Fetch on open if cache is stale.
  useEffect(() => {
    if (!open) return;

    const fresh = dataCache && Date.now() - dataCache.at < CACHE_TTL_MS;
    if (fresh) {
      setData({
        fields: dataCache!.fields,
        agents: dataCache!.agents,
        updates: dataCache!.updates,
      });
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const [fields, updates, agents] = await Promise.all([
          api.fields().catch(() => [] as Field[]),
          api.updates(50).catch(() => [] as FieldUpdate[]),
          role === "admin" ? api.agents().catch(() => [] as ApiUser[]) : Promise.resolve([] as ApiUser[]),
        ]);
        if (cancelled) return;
        const next = { fields, agents, updates };
        dataCache = { ...next, at: Date.now() };
        setData(next);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Search is unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, role]);

  // Focus the input on open (after it has a chance to mount).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 10);
    return () => window.clearTimeout(id);
  }, [open]);

  const grouped = useMemo(
    () => buildResults(query, data.fields, data.agents, data.updates, fieldHref),
    [query, data, fieldHref]
  );

  const flat = useMemo(() => flatten(grouped), [grouped]);

  // Clamp active index when the result set changes.
  useEffect(() => {
    setActiveIndex((i) => {
      if (flat.length === 0) return 0;
      return Math.min(i, flat.length - 1);
    });
  }, [flat.length]);

  const navigateTo = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
    },
    [router, onClose]
  );

  // Global keyboard handling while open.
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length));
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length));
      } else if (event.key === "Enter") {
        const selected = flat[activeIndex];
        if (selected) {
          event.preventDefault();
          navigateTo(selected.href);
        }
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, flat, activeIndex, navigateTo, onClose]);

  // Keep the active item in view as the user navigates.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const el = list.querySelector<HTMLElement>(`[data-result-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  if (!open) return null;

  const showRecent = query.trim().length === 0;
  const recentFields = data.fields.slice(0, 5);
  const recentUpdates = data.updates.slice(0, 5);
  const hasAnyData = data.fields.length + data.agents.length + data.updates.length > 0;

  let runningIndex = 0;
  const renderRow = (r: SearchResult) => {
    const Icon = ICON_BY_KIND[r.kind];
    const myIndex = runningIndex++;
    const active = myIndex === activeIndex;
    return (
      <button
        key={r.id}
        type="button"
        data-result-index={myIndex}
        onMouseEnter={() => setActiveIndex(myIndex)}
        onClick={() => navigateTo(r.href)}
        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left outline-none transition-colors duration-[160ms] ease-[var(--ease-out)] ${
          active ? "bg-hover-surface" : "hover:bg-hover-surface/60"
        }`}
      >
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-inset-surface text-zinc-600 dark:text-zinc-300">
          <Icon size={16} weight="regular" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-foreground">
            {highlight(r.title, query)}
          </span>
          <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
            {highlight(r.subtitle, query)}
          </span>
        </span>
        <ArrowRight
          size={14}
          weight="regular"
          className={`shrink-0 transition-opacity duration-[160ms] ease-[var(--ease-out)] ${
            active ? "opacity-70" : "opacity-0 group-hover:opacity-50"
          }`}
        />
      </button>
    );
  };

  const renderGroup = (label: string, results: SearchResult[]) => {
    if (results.length === 0) return null;
    return (
      <div key={label} className="px-1 py-1">
        <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          {label}
        </div>
        <div className="space-y-0.5">{results.map(renderRow)}</div>
      </div>
    );
  };

  const renderRecent = () => {
    if (loading && !hasAnyData) {
      return (
        <div className="space-y-2 p-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-11 animate-pulse rounded-lg bg-inset-surface/70"
              style={{ animationDelay: `${i * 60}ms` }}
            />
          ))}
        </div>
      );
    }
    if (error) {
      return (
        <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          {error}
        </div>
      );
    }
    if (!hasAnyData) {
      return (
        <div className="px-4 py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          Nothing to search yet.
        </div>
      );
    }

    return (
      <div className="px-1 py-1">
        {recentFields.length > 0 && (
          <div className="pb-1">
            <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Fields
            </div>
            <div className="space-y-0.5">
              {recentFields.map((f) => (
                <button
                  key={`recent-field-${f.id}`}
                  type="button"
                  onClick={() => navigateTo(fieldHref(f.id))}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-[160ms] ease-[var(--ease-out)] hover:bg-hover-surface"
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-inset-surface text-zinc-600 dark:text-zinc-300">
                    <Tractor size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{f.name}</span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {f.crop_type} · {STAGE_LABEL[f.current_stage] ?? f.current_stage}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {recentUpdates.length > 0 && (
          <div className="pb-1">
            <div className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
              Recent updates
            </div>
            <div className="space-y-0.5">
              {recentUpdates.slice(0, 4).map((u) => (
                <button
                  key={`recent-update-${u.id}`}
                  type="button"
                  onClick={() => navigateTo(fieldHref(u.field))}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors duration-[160ms] ease-[var(--ease-out)] hover:bg-hover-surface"
                >
                  <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-md bg-inset-surface text-zinc-600 dark:text-zinc-300">
                    <FileText size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {u.notes?.trim() || `${STAGE_LABEL[u.stage] ?? u.stage} update`}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {u.field_name} · {displayUserName(u.agent)} · {relativeTime(u.timestamp)}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className="search-overlay-root fixed inset-0 z-40 flex items-start justify-center bg-black/30 px-4 pt-[10vh] backdrop-blur-sm md:px-6"
      role="dialog"
      aria-modal="true"
      aria-label="Search"
      onMouseDown={(event) => {
        if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
          onClose();
        }
      }}
    >
      <div
        ref={panelRef}
        className="search-overlay-panel w-full max-w-xl overflow-hidden rounded-[var(--radius-md)] border border-black/[.08] bg-popover text-foreground shadow-[0_24px_64px_rgba(0,0,0,0.16)] dark:border-white/[.08] dark:shadow-[0_24px_64px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-black/[.08] px-4 dark:border-white/[.08]">
          <MagnifyingGlass size={18} className="shrink-0 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search fields, agents, updates"
            className="h-12 w-full bg-transparent text-base text-foreground outline-none placeholder:text-zinc-400"
            autoComplete="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors duration-[160ms] ease-[var(--ease-out)] hover:bg-hover-surface hover:text-foreground"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {showRecent ? (
            renderRecent()
          ) : flat.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {loading ? "Searching…" : <>No results for &ldquo;{query.trim()}&rdquo;</>}
            </div>
          ) : (
            <>
              {renderGroup("Fields", grouped.fields)}
              {renderGroup("Agents", grouped.agents)}
              {renderGroup("Updates", grouped.updates)}
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-black/[.08] px-3 py-2 text-[11px] text-zinc-400 dark:border-white/[.08] dark:text-zinc-500">
          <div className="flex items-center gap-3">
            <Hint label="Navigate" keys={["↑", "↓"]} />
            <Hint label="Open" keys={["↵"]} />
            <Hint label="Close" keys={["Esc"]} />
          </div>
          <div className="hidden items-center gap-1 md:flex">
            <CornersOut size={11} />
            <span>{flat.length === 0 && !showRecent ? "0 results" : `${flat.length} result${flat.length === 1 ? "" : "s"}`}</span>
          </div>
        </div>
      </div>

    </div>
  );
}

function Hint({ label, keys }: { label: string; keys: string[] }) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k) => (
        <kbd
          key={k}
          className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-black/[.08] bg-inset-surface px-1 font-mono text-[10px] text-zinc-600 dark:border-white/[.08] dark:text-zinc-300"
        >
          {k}
        </kbd>
      ))}
      <span>{label}</span>
    </span>
  );
}
